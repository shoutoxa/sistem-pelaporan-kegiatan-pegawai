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

export function createReportService({ prisma, storage, clock = () => new Date(), ftthApi: injectedFtthApi }) {
  const ftth = injectedFtthApi || ftthApi
  if (prisma) {
    async function createReport({ actor, fields, files }) {
      const parsed = reportSchema.safeParse(fields)
      if (!parsed.success) throw reportError('VALIDATION', 'Field laporan belum lengkap atau tidak valid.')
      if (!Array.isArray(files) || files.length < 1) throw reportError('FILE_VALIDATION', 'Minimal satu foto wajib diunggah.')
      if (files.length > 5) throw reportError('FILE_LIMIT', 'Maksimal lima foto dapat diunggah.')
      for (const file of files) {
        if (!allowedImageMime.has(file.mimetype)) throw reportError('FILE_VALIDATION', 'Format foto harus JPG, PNG, atau WEBP.')
        if (file.size > 10_000_000) throw reportError('FILE_LIMIT', 'Ukuran setiap foto maksimal 10 MB.')
      }

      const today = jakartaDate(clock())
      const yesterdayDate = new Date(clock().getTime() - 86_400_000)
      const yesterday = jakartaDate(yesterdayDate)
      if (![today, yesterday].includes(parsed.data.tanggalKegiatan)) throw reportError('DATE_VALIDATION', 'Tanggal kegiatan hanya boleh hari ini atau kemarin.')

      const jobId = parsed.data.pekerjaanId || parsed.data.processId
      const [cluster, pekerjaan] = await Promise.all([
        prisma.cluster.findFirst({ where: { id: parsed.data.clusterId, isActive: true, desa: { isActive: true } } }),
        prisma.pekerjaan.findFirst({
          where: {
            id: jobId,
            isActive: true,
            OR: [{ kategoriId: null }, { kategori: { isActive: true } }],
          },
        }),
      ])
      if (!cluster) throw reportError('REFERENCE_INVALID', 'Cluster tidak aktif atau tidak ditemukan.')
      if (!pekerjaan) throw reportError('REFERENCE_INVALID', 'Pekerjaan tidak aktif atau tidak ditemukan.')

      const reportId = randomUUID()
      const uploadedPaths = []
      const documentation = files.map((file) => ({
        path: `laporan/${actor.id}/${parsed.data.tanggalKegiatan}/${reportId}/${randomUUID()}.${extensionFor(file.mimetype, file.originalname)}`,
        file,
      }))

      const nomorPerangkat = parsed.data.nomorPerangkat ? parsed.data.nomorPerangkat.trim() : null

      try {
        for (const item of documentation) {
          try {
            await storage.upload({ path: item.path, file: item.file })
            uploadedPaths.push(item.path)
          } catch {
            throw reportError('STORAGE_ERROR', 'Foto gagal disimpan.')
          }
        }

        try {
          return await prisma.$transaction(async (tx) => {
            const report = await tx.laporan.create({
              data: {
                id: reportId,
                userId: actor.id,
                clusterId: parsed.data.clusterId,
                pekerjaanId: jobId,
                tanggalKegiatan: new Date(`${parsed.data.tanggalKegiatan}T00:00:00.000Z`),
                keterangan: parsed.data.keterangan,
                nomorPerangkat: nomorPerangkat || null,
              },
            })
            await tx.dokumentasi.createMany({
              data: documentation.map(({ path, file }) => ({ laporanId: reportId, storagePath: path, originalName: file.originalname, mimeType: file.mimetype, fileSize: file.size })),
            })
            return report
          })
        } catch {
          throw reportError('DATABASE_ERROR', 'Laporan gagal disimpan.')
        }
      } catch (error) {
        try { await storage.remove(uploadedPaths) } catch { /* cleanup is best effort */ }
        throw error.code ? error : reportError('STORAGE_ERROR', 'Foto gagal disimpan.')
      }
    }

    async function getReportDetail({ actor, reportId }) {
      const where = actor.role === 'SUPERADMIN' ? { id: reportId } : { id: reportId, userId: actor.id }
      const report = await prisma.laporan.findFirst({
        where,
        include: {
          user: { select: { id: true, nama: true, username: true, nomorHp: true } },
          cluster: { include: { desa: true } },
          pekerjaan: true,
          dokumentasi: true,
        },
      })
      if (!report) throw reportError('NOT_FOUND', 'Laporan tidak ditemukan.')
      const dokumentasi = await Promise.all(report.dokumentasi.map(async (item) => ({ ...item, signedUrl: await storage.createSignedUrl(item.storagePath, 600) })))
      const editableUntilDate = new Date(new Date(report.createdAt).getTime() + 24 * 60 * 60 * 1000)
      const withinEditWindow = clock().getTime() <= editableUntilDate.getTime()
      const canEdit = actor.role === 'SUPERADMIN' ? !report.diterima : actor.role === 'PEGAWAI' && !report.diterima && withinEditWindow
      return { ...report, dokumentasi, editableUntil: editableUntilDate.toISOString(), canEdit }
    }

    async function updateReportFields({ reportId, report, fields }) {
      const data = {}
      if (fields.keterangan !== undefined) {
        if (typeof fields.keterangan !== 'string' || fields.keterangan.trim().length < 5 || fields.keterangan.trim().length > 2000) throw reportError('VALIDATION', 'Keterangan harus 5 sampai 2.000 karakter.')
        data.keterangan = fields.keterangan.trim()
      }
      if (fields.tanggalKegiatan !== undefined) {
        const today = jakartaDate(clock())
        const yesterday = jakartaDate(new Date(clock().getTime() - 86_400_000))
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.tanggalKegiatan) || ![today, yesterday].includes(fields.tanggalKegiatan)) throw reportError('DATE_VALIDATION', 'Tanggal kegiatan hanya boleh hari ini atau kemarin.')
        data.tanggalKegiatan = new Date(`${fields.tanggalKegiatan}T00:00:00.000Z`)
      }
      if (fields.clusterId !== undefined) {
        if (!await prisma.cluster.findFirst({ where: { id: fields.clusterId, isActive: true, desa: { isActive: true } } })) throw reportError('REFERENCE_INVALID', 'Cluster tidak aktif atau tidak ditemukan.')
        data.clusterId = fields.clusterId
      }
      const jobId = fields.pekerjaanId !== undefined ? fields.pekerjaanId : fields.processId
      if (jobId !== undefined) {
        const pekerjaan = await prisma.pekerjaan.findFirst({
          where: {
            id: jobId,
            isActive: true,
            OR: [{ kategoriId: null }, { kategori: { isActive: true } }],
          },
        })
        if (!pekerjaan) throw reportError('REFERENCE_INVALID', 'Pekerjaan tidak aktif atau tidak ditemukan.')
        data.pekerjaanId = jobId
      }
      if (fields.nomorPerangkat !== undefined) {
        const np = String(fields.nomorPerangkat).trim()
        if (np.length > 20) throw reportError('VALIDATION', 'Nomor perangkat maksimal 20 karakter.')
        data.nomorPerangkat = np || null
      }
      return prisma.laporan.update({ where: { id: reportId }, data })
    }

    async function updateReport({ actor, reportId, fields }) {
      if (fields && Object.prototype.hasOwnProperty.call(fields, 'diterima')) throw reportError('FORBIDDEN', 'Status penerimaan hanya dapat diubah oleh Superadmin.')
      const report = await prisma.laporan.findFirst({ where: { id: reportId, userId: actor.id } })
      if (!report) throw reportError('NOT_FOUND', 'Laporan tidak ditemukan.')
      if (report.diterima) throw reportError('LOCKED', 'Laporan sudah diterima dan terkunci.')
      if (clock().getTime() - new Date(report.createdAt).getTime() > 24 * 60 * 60 * 1000) throw reportError('EDIT_EXPIRED', 'Batas edit laporan sudah lewat 24 jam.')
      return updateReportFields({ reportId, report, fields })
    }

    async function updateReportByAdmin({ reportId, fields }) {
      if (fields && Object.prototype.hasOwnProperty.call(fields, 'diterima')) throw reportError('FORBIDDEN', 'Gunakan endpoint status untuk mengubah penerimaan laporan.')
      const report = await prisma.laporan.findUnique({ where: { id: reportId } })
      if (!report) throw reportError('NOT_FOUND', 'Laporan tidak ditemukan.')
      if (report.diterima) throw reportError('LOCKED', 'Buka kembali penerimaan laporan sebelum mengoreksi data.')
      return updateReportFields({ reportId, report, fields })
    }

    async function updateDiterimaStatus({ reportId, diterima }) {
      const report = await prisma.laporan.findUnique({ where: { id: reportId } })
      if (!report) throw reportError('NOT_FOUND', 'Laporan tidak ditemukan.')
      return prisma.laporan.update({ where: { id: reportId }, data: { diterima: Boolean(diterima) } })
    }

    return { createReport, getReportDetail, updateReport, updateReportByAdmin, updateDiterimaStatus }
  }

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
