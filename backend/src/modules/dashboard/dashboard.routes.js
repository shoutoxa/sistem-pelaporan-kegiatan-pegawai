import { Router } from 'express'

function sendError(error, response) { return response.status(({ NOT_FOUND: 404, FORBIDDEN: 403, MAPPING_REQUIRED: 409, VALIDATION: 400, INTEGRATION_NOT_CONFIGURED: 503, INTEGRATION_UNAVAILABLE: 502, INTEGRATION_UNAUTHORIZED: 502, INTEGRATION_INVALID_RESPONSE: 502 })[error.code] || 500).json({ message: error.message || 'Terjadi kesalahan pada server.' }) }

export function createDashboardRouter({ dashboardService, historyService, requireAuth, requireSuperadmin, ftthReports, ftthDocumentation } = {}) {
  const router = Router()
  const employeeGuard = requireAuth ? [requireAuth] : []
  const adminGuard = [requireAuth, requireSuperadmin].filter(Boolean)
  router.get('/laporan/saya', ...employeeGuard, async (request, response) => { try { return response.json({ data: await historyService.listOwnReports({ actor: request.user, ...request.query }) }) } catch (error) { return sendError(error, response) } })
  router.get('/admin/dashboard', ...adminGuard, async (request, response) => { try { return response.json({ data: ftthReports ? await ftthReports.dashboard(request.user) : await dashboardService.getDashboard(request.query) }) } catch (error) { return sendError(error, response) } })
  router.get('/admin/laporan', ...adminGuard, async (request, response) => { try { return response.json({ data: ftthReports ? await ftthReports.listAdminReports(request.user, request.query) : await historyService.listAdminReports(request.query) }) } catch (error) { return sendError(error, response) } })
  router.get('/admin/dokumentasi', ...adminGuard, async (request, response) => { try { return response.json({ data: ftthDocumentation ? await ftthDocumentation.documentation(request.user, request.query) : await historyService.listDocumentation(request.query) }) } catch (error) { return sendError(error, response) } })
  return router
}

export async function createProductionDashboardRouter({ authService } = {}) {
  const [{ prisma }, { requireAuth, requireRole }, { createHistoryService }, { createDashboardService }] = await Promise.all([
    import('../../config/prisma.js'),
    import('../auth/auth.middleware.js'),
    import('../history/history.service.js'),
    import('./dashboard.service.js'),
  ])
  const sessionService = authService || await (await import('../auth/auth.routes.js')).createProductionAuthService()
  let storage
  const hasStorageKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (process.env.SUPABASE_URL && hasStorageKey) storage = (await import('../../config/supabase.js')).createSupabaseStorage()
  const authMiddleware = requireAuth({ authService: sessionService })
  const { runtimeConfig } = await import('../../config/env.js')
  let ftthReports
  // Reports and documentation cut over independently; dashboard and legacy detail remain local.
  if (runtimeConfig.migration.reports === 'ftth' || runtimeConfig.migration.documentation === 'ftth') {
    const { createFtthClient } = await import('../integration/ftth.client.js')
    const { createFtthRepository } = await import('../integration/ftth.repository.js')
    const { createFtthReportService } = await import('../integration/ftth-report.service.js')
    ftthReports = createFtthReportService({ client: createFtthClient(), repository: createFtthRepository(prisma), storage })
  }
  return createDashboardRouter({ ftthReports: runtimeConfig.migration.reports === 'ftth' ? ftthReports : undefined, ftthDocumentation: runtimeConfig.migration.documentation === 'ftth' ? ftthReports : undefined, dashboardService: createDashboardService({ prisma, storage }), historyService: createHistoryService({ prisma, storage }), requireAuth: authMiddleware, requireSuperadmin: requireRole('SUPERADMIN') })
}
