import { Router } from 'express'

function sendError(error, response) { return response.status(error.code === 'NOT_FOUND' ? 404 : 500).json({ message: error.message || 'Terjadi kesalahan pada server.' }) }

export function createDashboardRouter({ dashboardService, historyService, requireAuth, requireSuperadmin }) {
  const router = Router()
  const employeeGuard = [requireAuth].filter(Boolean)
  const adminGuard = [requireAuth, requireSuperadmin].filter(Boolean)
  router.get('/laporan/saya', ...employeeGuard, async (request, response) => { try { return response.json({ data: await historyService.listOwnReports({ actor: request.user, ...request.query }) }) } catch (error) { return sendError(error, response) } })
  router.get('/admin/dashboard', ...adminGuard, async (request, response) => { try { return response.json({ data: await dashboardService.getDashboard(request.query) }) } catch (error) { return sendError(error, response) } })
  router.get('/admin/laporan', ...adminGuard, async (request, response) => { try { return response.json({ data: await historyService.listAdminReports(request.query) }) } catch (error) { return sendError(error, response) } })
  router.get('/admin/dokumentasi', ...adminGuard, async (request, response) => { try { return response.json({ data: await historyService.listDocumentation(request.query) }) } catch (error) { return sendError(error, response) } })
  return router
}

export async function createProductionDashboardRouter() {
  const [{ requireAuth, requireRole }, { createHistoryService }, { createDashboardService }] = await Promise.all([
    import('../auth/auth.middleware.js'),
    import('../history/history.service.js'),
    import('./dashboard.service.js'),
  ])
  const { createProductionAuthService } = await import('../auth/auth.routes.js')
  const sessionService = await createProductionAuthService()

  return createDashboardRouter({
    dashboardService: createDashboardService(),
    historyService: createHistoryService(),
    requireAuth: requireAuth({ authService: sessionService }),
    requireSuperadmin: requireRole('SUPERADMIN'),
  })
}
