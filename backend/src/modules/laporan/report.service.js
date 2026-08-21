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

    const [rw, tahapan] = await Promise.all([
      prisma.rw.findFirst({ where: { id: parsed.data.rwId, isActive: true } }),
      prisma.tahapan.findFirst({ where: { id: parsed.data.tahapanId, isActive: true } }),
    ])
    if (!rw) throw reportError('REFERENCE_INVALID', 'RW tidak aktif atau tidak ditemukan.')
    if (!tahapan) throw reportError('REFERENCE_INVALID', 'Tahapan tidak aktif atau tidak ditemukan.')
    if (tahapan.requiresNomorPerangkat && !parsed.data.nomorPerangkat) throw reportError('VALIDATION', 'Nomor Perangkat wajib diisi untuk Tahapan ini.')

    const reportId = randomUUID()
    const uploadedPaths = []
    const documentation = files.map((file, index) => ({
      path: `reports/${actor.id}/${reportId}/${index + 1}.${extensionFor(file.mimetype, file.originalname)}`,
      file,
    }))

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
              rwId: parsed.data.rwId,
              tahapanId: parsed.data.tahapanId,
              tanggalKegiatan: new Date(`${parsed.data.tanggalKegiatan}T00:00:00.000Z`),
              keterangan: parsed.data.keterangan,
              nomorPerangkat: tahapan.requiresNomorPerangkat ? parsed.data.nomorPerangkat : null,
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
    const report = await prisma.laporan.findFirst({ where, include: { dokumentasi: true } })
    if (!report) throw reportError('NOT_FOUND', 'Laporan tidak ditemukan.')
    const dokumentasi = await Promise.all(report.dokumentasi.map(async (item) => ({ ...item, signedUrl: await storage.createSignedUrl(item.storagePath, 600) })))
    return { ...report, dokumentasi }
  }

  return { createReport, getReportDetail }
}
