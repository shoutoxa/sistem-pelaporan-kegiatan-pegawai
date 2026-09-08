import { randomUUID } from 'node:crypto'
import { reportError, reportSchema, reportUpdateSchema, reportApprovalSchema, jakartaDate, toFttPayload, toFttApprovalPayload } from './report.schemas.js'
import { ftthApi } from '../../services/ftthApi.js'

const allowedImageMime = new Set(['image/jpeg', 'image/png', 'image/webp'])
const allowedDocMime = new Set([
  'application/pdf',
  'application/vnd.google-earth.kmz',
  'application/vnd.google-earth.kml+xml',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/zip',
])
const allowedMime = new Set([...allowedImageMime, ...allowedDocMime])
const maxFiles = 10
const maxBytes = 20_000_000

function extensionFor(mimetype, originalname = '') {
  if (mimetype === 'image/png') return 'png'
  if (mimetype === 'image/webp') return 'webp'
  if (mimetype === 'application/pdf') return 'pdf'
  if (mimetype === 'application/vnd.google-earth.kmz') return 'kmz'
  if (mimetype === 'application/vnd.google-earth.kml+xml') return 'kml'
  if (mimetype.includes('spreadsheetml') || mimetype.includes('excel')) return 'xlsx'
  if (mimetype === 'application/zip') return 'zip'
  const extension = originalname.split('.').pop()?.toLowerCase()
  return extension || 'bin'
}

function getFileCategory(mimetype) {
  if (allowedImageMime.has(mimetype)) return 'foto'
  return 'dokumen'
}

export function createReportService({ storage, clock = () => new Date(), ftthApi: injectedFtthApi } = {}) {
  const ftth = injectedFtthApi || ftthApi

  async function createReport({ actor, fields, files }) {
    const parsed = reportSchema.safeParse(fields)
    if (!parsed.success) throw reportError('VALIDATION', 'Field laporan belum lengkap atau tidak valid.')
    if (!Array.isArray(files) || files.length < 1) throw reportError('FILE_VALIDATION', 'Minimal satu dokumen wajib diunggah.')
    if (files.length > maxFiles) throw reportError('FILE_LIMIT', 'Maksimal ' + maxFiles + ' file dapat diunggah.')
    for (const file of files) {
      if (!allowedMime.has(file.mimetype)) throw reportError('FILE_VALIDATION', 'Format file tidak diizinkan. Gunakan JPG, PNG, PDF, KMZ, KML, XLSX, atau ZIP.')
      if (file.size > maxBytes) throw reportError('FILE_LIMIT', 'Ukuran setiap file maksimal 20 MB.')
    }

    const today = jakartaDate(clock())
    const yesterdayDate = new Date(clock().getTime() - 86_400_000)
    const yesterday = jakartaDate(yesterdayDate)
    if (![today, yesterday].includes(parsed.data.tanggalKegiatan)) throw reportError('DATE_VALIDATION', 'Tanggal kegiatan hanya boleh hari ini atau kemarin.')

    const [cluster, process] = await Promise.all([
      ftth.getClusterById(parsed.data.clusterId),
      ftth.getMasterProcessById(parsed.data.processId),
    ])
    if (!cluster) throw reportError('REFERENCE_INVALID', 'Cluster tidak ditemukan.')
    if (!process) throw reportError('REFERENCE_INVALID', 'Pekerjaan tidak ditemukan.')

    const nomorPerangkat = parsed.data.nomorPerangkat ? parsed.data.nomorPerangkat.trim() : null

    try {
      const ftPayload = {
        ...toFttPayload(parsed.data),
        user_id: actor.id,
        status: 'PENDING',
      }
      const reportResponse = await ftth.createReport(ftPayload)
      const createdReport = reportResponse.data || reportResponse

      await Promise.all(files.map(async (file) => {
        const fileBuffer = file.buffer
        const fileName = randomUUID() + '.' + extensionFor(file.mimetype, file.originalname)
        const uploadResult = await ftth.uploadDocumentation(fileBuffer, fileName, file.mimetype)
        const fileUrl = uploadResult.file_url || uploadResult.url || fileName

        await ftth.createDocumentation({
          laporan_id: createdReport.id,
          file_url: fileUrl,
          original_name: file.originalname,
          mime_type: file.mimetype,
          file_size: file.size,
          tipe_berkas: getFileCategory(file.mimetype),
        })
      }))

      return createdReport
    } catch (error) {
      if (error.status) throw error
      throw reportError('UPLOAD_ERROR', 'Laporan gagal disimpan.')
    }
  }

  async function getReportDetail({ actor, reportId }) {
    const response = await ftth.getReportById(reportId)
    const report = response.data || response
    if (!report) throw reportError('NOT_FOUND', 'Laporan tidak ditemukan.')
    if (actor.role !== 'SUPERADMIN' && report.user_id !== actor.id) throw reportError('NOT_FOUND', 'Laporan tidak ditemukan.')

    let rawDocs = report.dokumentasi || report.dokumentasi_laporan || []
    if (!Array.isArray(rawDocs) || rawDocs.length === 0) {
      const dokumentasiResponse = await ftth.getDocumentation({ laporan_id: reportId }).catch(() => [])
      const dokumentasiList = dokumentasiResponse.data || dokumentasiResponse || []
      rawDocs = (Array.isArray(dokumentasiList) ? dokumentasiList : [dokumentasiList]).filter(
        (item) => (item.laporan_id || item.laporanId) === reportId
      )
    } else {
      rawDocs = rawDocs.filter((item) => !item.laporan_id || item.laporan_id === reportId)
    }

    const dokumentasi = await Promise.all(
      rawDocs.map(async (item) => {
        let signedUrl = item.file_url || item.storagePath
        if (item.file_url && item.file_url.startsWith('/uploads/')) {
          signedUrl = 'https://ftth.digitak.id' + item.file_url
        } else if (storage?.createSignedUrl && item.file_url && !item.file_url.startsWith('http')) {
          try { signedUrl = await storage.createSignedUrl(item.file_url, 600) } catch { /* use original path */ }
        } else if (signedUrl && !signedUrl.startsWith('http')) {
          signedUrl = '/api/files/' + signedUrl.replace(/^\/+/, '')
        }
        return { ...item, signedUrl }
      })
    )

    const isApproved = report.status === 'APPROVED'
    const now = clock().getTime()
    const createdAtTime = new Date(report.created_at || report.createdAt || now).getTime()
    const validCreatedAt = isNaN(createdAtTime) ? now : createdAtTime
    const editableUntilDate = new Date(validCreatedAt + 24 * 60 * 60 * 1000)
    const withinEditWindow = now <= editableUntilDate.getTime()
    const canEdit = actor.role === 'SUPERADMIN' ? !isApproved : actor.role === 'PEGAWAI' && !isApproved && withinEditWindow

    return {
      ...report,
      dokumentasi,
      canEdit,
      editableUntil: editableUntilDate.toISOString(),
    }
  }

  async function updateReport({ actor, reportId, fields }) {
    const parsed = reportUpdateSchema.safeParse(fields)
    if (!parsed.success) throw reportError('VALIDATION', 'Field update tidak valid.')

    const existingResponse = await ftth.getReportById(reportId)
    const existing = existingResponse.data || existingResponse
    if (!existing) throw reportError('NOT_FOUND', 'Laporan tidak ditemukan.')
    if (existing.user_id !== actor.id && actor.role !== 'SUPERADMIN') throw reportError('FORBIDDEN', 'Tidak diizinkan mengubah laporan ini.')
    if (existing.status === 'APPROVED') throw reportError('LOCKED', 'Laporan sudah disetujui dan terkunci.')

    const updateData = {}
    if (parsed.data.projectId) updateData.project_id = parsed.data.projectId
    if (parsed.data.clusterId) updateData.cluster_id = parsed.data.clusterId
    if (parsed.data.processId) updateData.process_id = parsed.data.processId
    if (parsed.data.tanggalKegiatan) {
      const today = jakartaDate(clock())
      const yesterday = jakartaDate(new Date(clock().getTime() - 86_400_000))
      if (![today, yesterday].includes(parsed.data.tanggalKegiatan)) throw reportError('DATE_VALIDATION', 'Tanggal kegiatan hanya boleh hari ini atau kemarin.')
      updateData.tanggal_kegiatan = parsed.data.tanggalKegiatan
    }
    if (parsed.data.keterangan !== undefined) updateData.keterangan = parsed.data.keterangan.trim()
    if (parsed.data.nomorPerangkat !== undefined) updateData.nomor_perangkat = parsed.data.nomorPerangkat?.trim() || null

    if (Object.keys(updateData).length === 0) throw reportError('VALIDATION', 'Tidak ada data yang diubah.')

    const response = await ftth.updateReport(reportId, updateData)
    return response.data || response
  }

  async function updateReportByAdmin({ actor, reportId, fields }) {
    if (fields.status !== undefined || fields.catatanRevisi !== undefined) {
      throw reportError('FORBIDDEN', 'Gunakan endpoint status untuk mengubah status persetujuan.')
    }
    return updateReport({ actor, reportId, fields })
  }

  async function updateReportStatus({ reportId, fields, actor }) {
    const parsed = reportApprovalSchema.safeParse(fields)
    if (!parsed.success) throw reportError('VALIDATION', 'Data approval tidak valid.')

    const existingResponse = await ftth.getReportById(reportId)
    const existing = existingResponse.data || existingResponse
    if (!existing) throw reportError('NOT_FOUND', 'Laporan tidak ditemukan.')

    const payload = toFttApprovalPayload(parsed.data, actor)
    const response = await ftth.updateReport(reportId, payload)
    return response.data || response
  }

  async function deleteReport({ actor, reportId }) {
    if (actor.role !== 'SUPERADMIN') throw reportError('FORBIDDEN', 'Hanya Superadmin yang dapat menghapus laporan.')
    await ftth.deleteReport(reportId)
    return { id: reportId, deleted: true }
  }

  return { createReport, getReportDetail, updateReport, updateReportByAdmin, updateReportStatus, deleteReport }
}
