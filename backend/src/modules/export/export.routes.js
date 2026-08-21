import { Router } from 'express'

export function createExportRouter({ exportService, requireAuth, requireSuperadmin } = {}) {
  const router = Router()
  const guard = [requireAuth, requireSuperadmin].filter(Boolean)
  router.get('/admin/laporan/export', ...guard, async (request, response) => {
    const buffer = await exportService.exportReports(request.query)
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response.setHeader('Content-Disposition', 'attachment; filename="laporan.xlsx"')
    return response.send(Buffer.from(buffer))
  })
  return router
}

export async function createProductionExportRouter({ authService } = {}) {
  const [{ prisma }, { requireAuth, requireRole }, { createExportService }] = await Promise.all([import('../../config/prisma.js'), import('../auth/auth.middleware.js'), import('./export.service.js')])
  const sessionService = authService || await (await import('../auth/auth.routes.js')).createProductionAuthService()
  const filtersToWhere = ({ from, to, pegawaiId, desaId, rwId, tahapanId }) => ({ ...(pegawaiId ? { userId: pegawaiId } : {}), ...(desaId ? { rw: { desaId } } : {}), ...(rwId ? { rwId } : {}), ...(tahapanId ? { tahapanId } : {}), ...((from || to) ? { tanggalKegiatan: { ...(from ? { gte: new Date(`${from}T00:00:00Z`) } : {}), ...(to ? { lte: new Date(`${to}T00:00:00Z`) } : {}) } } : {}) })
  const exportService = createExportService({ rowsProvider: (filters) => prisma.laporan.findMany({ where: filtersToWhere(filters), include: { user: true, rw: { include: { desa: true } }, tahapan: true }, orderBy: { createdAt: 'desc' } }) })
  return createExportRouter({ exportService, requireAuth: requireAuth({ authService: sessionService }), requireSuperadmin: requireRole('SUPERADMIN') })
}
