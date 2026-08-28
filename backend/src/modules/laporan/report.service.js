import { randomUUID } from 'node:crypto'
import { reportError, reportSchema, jakartaDate } from './report.schemas.js'

const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maxFiles = 5
const maxBytes = 10_000_000

function extensionFor(mimetype, originalname = '') {
  if (mimetype === 'image/png') return 'png'
  if (mimetype === 'image/webp') return 'webp'
  const extension = originalname.split('.').pop()?.toLowerCase()
  return extension === 'jpeg' ? 'jpg' : 'jpg'
}

export function createReportService({ prisma, storage, clock = () => new Date() }) {
  async function createReport({ actor, fields, files }) {
    const parsed = reportSchema.safeParse(fields)
    if (!parsed.success) throw reportError('VALIDATION', 'Field laporan belum lengkap atau tidak valid.')
    if (!Array.isArray(files) || files.length < 1) throw reportError('FILE_VALIDATION', 'Minimal satu foto wajib diunggah.')
    if (files.length > maxFiles) throw reportError('FILE_LIMIT', 'Maksimal lima foto dapat diunggah.')
    for (const file of files) {
      if (!allowedMime.has(file.mimetype)) throw reportError('FILE_VALIDATION', 'Format foto harus JPG, PNG, atau WEBP.')
      if (file.size > maxBytes) throw reportError('FILE_LIMIT', 'Ukuran setiap foto maksimal 10 MB.')
    }

    const today = jakartaDate(clock())
    const yesterdayDate = new Date(clock().getTime() - 86_400_000)
    const yesterday = jakartaDate(yesterdayDate)
    if (![today, yesterday].includes(parsed.data.tanggalKegiatan)) throw reportError('DATE_VALIDATION', 'Tanggal kegiatan hanya boleh hari ini atau kemarin.')

    const [cluster, pekerjaan] = await Promise.all([
      prisma.cluster.findFirst({ where: { id: parsed.data.clusterId, isActive: true, desa: { isActive: true } } }),
      prisma.pekerjaan.findFirst({ where: { id: parsed.data.pekerjaanId, isActive: true } }),
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
              pekerjaanId: parsed.data.pekerjaanId,
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
    if (fields.pekerjaanId !== undefined) {
      const pekerjaan = await prisma.pekerjaan.findFirst({ where: { id: fields.pekerjaanId, isActive: true } })
      if (!pekerjaan) throw reportError('REFERENCE_INVALID', 'Pekerjaan tidak aktif atau tidak ditemukan.')
      data.pekerjaanId = fields.pekerjaanId
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
