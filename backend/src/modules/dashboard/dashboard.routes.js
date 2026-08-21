import { Router } from 'express'

function sendError(error, response) { return response.status(error.code === 'NOT_FOUND' ? 404 : 500).json({ error: error.message || 'Terjadi kesalahan pada server.' }) }

export function createDashboardRouter({ dashboardService, historyService, requireAuth, requireSuperadmin } = {}) {
  const router = Router()
  const employeeGuard = requireAuth ? [requireAuth] : []
  const adminGuard = [requireAuth, requireSuperadmin].filter(Boolean)
  router.get('/laporan/saya', ...employeeGuard, async (request, response) => { try { return response.json({ data: await historyService.listOwnReports({ actor: request.user, ...request.query }) }) } catch (error) { return sendError(error, response) } })
  router.get('/admin/dashboard', ...adminGuard, async (request, response) => { try { return response.json({ data: await dashboardService.getDashboard({ date: request.query.date }) }) } catch (error) { return sendError(error, response) } })
  router.get('/admin/laporan', ...adminGuard, async (request, response) => { try { return response.json({ data: await historyService.listAdminReports(request.query) }) } catch (error) { return sendError(error, response) } })
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
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) storage = (await import('../../config/supabase.js')).createSupabaseStorage()
  const authMiddleware = requireAuth({ authService: sessionService })
  return createDashboardRouter({ dashboardService: createDashboardService({ prisma }), historyService: createHistoryService({ prisma, storage }), requireAuth: authMiddleware, requireSuperadmin: requireRole('SUPERADMIN') })
}
