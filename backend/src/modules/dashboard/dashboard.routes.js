import { Router } from 'express'
import { createLocalStorage } from '../laporan/report.storage.js'

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

  let storage
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)
      const { createSupabaseStorage: createSS } = await import('../laporan/report.storage.js')
      storage = createSS({ client: supabase, bucket: 'laporan' })
    } catch (e) {
      console.warn('Supabase not available, using local storage')
      storage = createLocalStorage()
    }
  } else {
    storage = createLocalStorage()
  }

  return createDashboardRouter({
    dashboardService: createDashboardService({ storage }),
    historyService: createHistoryService({ storage }),
    requireAuth: requireAuth({ authService: sessionService }),
    requireSuperadmin: requireRole('SUPERADMIN'),
  })
}
