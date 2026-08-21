function historyError(code, message) { const error = new Error(message); error.code = code; return error }

export function createHistoryService({ prisma, storage }) {
  async function listOwnReports({ actor, page = 1, limit = 20, tanggal, tahapanId }) {
    const safePage = Math.max(1, Number(page) || 1)
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
    const where = { userId: actor.id }
    if (tanggal) where.tanggalKegiatan = new Date(`${tanggal}T00:00:00.000Z`)
    if (tahapanId) where.tahapanId = tahapanId
    const [items, total] = await Promise.all([
      prisma.laporan.findMany({ where, include: { rw: { include: { desa: true } }, tahapan: true, dokumentasi: true }, orderBy: { createdAt: 'desc' }, skip: (safePage - 1) * safeLimit, take: safeLimit }),
      prisma.laporan.count({ where }),
    ])
    return { items, total, page: safePage, limit: safeLimit }
  }

  async function getReportDetail({ actor, reportId }) {
    const where = actor.role === 'SUPERADMIN' ? { id: reportId } : { id: reportId, userId: actor.id }
    const report = await prisma.laporan.findFirst({ where, include: { rw: { include: { desa: true } }, tahapan: true, dokumentasi: true } })
    if (!report || (actor.role !== 'SUPERADMIN' && report.userId !== actor.id)) throw historyError('NOT_FOUND', 'Laporan tidak ditemukan.')
    const dokumentasi = storage ? await Promise.all(report.dokumentasi.map(async (item) => ({ ...item, signedUrl: await storage.createSignedUrl(item.storagePath, 600) }))) : report.dokumentasi
    return { ...report, dokumentasi }
  }

  async function listAdminReports(filters = {}) {
    const { page = 1, limit = 20, from, to, pegawaiId, desaId, rwId, tahapanId } = filters
    const safePage = Math.max(1, Number(page) || 1)
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
    const where = {}
    if (pegawaiId) where.userId = pegawaiId
    if (rwId) where.rwId = rwId
    if (tahapanId) where.tahapanId = tahapanId
    if (desaId) where.rw = { desaId }
    if (from || to) where.tanggalKegiatan = { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T00:00:00.000Z`) } : {}) }
    const [items, total] = await Promise.all([
      prisma.laporan.findMany({ where, include: { user: true, rw: { include: { desa: true } }, tahapan: true, dokumentasi: true }, orderBy: { createdAt: 'desc' }, skip: (safePage - 1) * safeLimit, take: safeLimit }),
      prisma.laporan.count({ where }),
    ])
    return { items, total, page: safePage, limit: safeLimit }
  }

  return { listOwnReports, getReportDetail, listAdminReports }
}
