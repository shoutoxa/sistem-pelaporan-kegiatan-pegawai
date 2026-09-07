import { Router } from 'express'
import { statusSchema } from './master.schemas.js'

function sendError(error, response) {
  const statuses = {
    VALIDATION: 400,
    DUPLICATE: 409,
    INACTIVE_PARENT: 422,
    NOT_FOUND: 404,
    INTEGRATION_NOT_CONFIGURED: 503,
    INTEGRATION_UNAUTHORIZED: 502,
    INTEGRATION_UNAVAILABLE: 502,
    INTEGRATION_INVALID_RESPONSE: 502,
    READ_ONLY: 403,
  }
  const message = error.message || 'Terjadi kesalahan pada server.'
  const fieldByResource = { desa: 'namaDesa', cluster: 'clusterName', pekerjaan: 'namaPekerjaan' }
  const field = error.field || (error.code === 'DUPLICATE' ? fieldByResource[error.resource] : undefined)
  const errors = error.errors || (field ? { [field]: message } : undefined)
  return response.status(statuses[error.code] || 500).json({ message, ...(errors ? { errors } : {}) })
}

export function createMasterRouter({ service, requireAuth, requireSuperadmin } = {}) {
  const router = Router()
  const readGuard = [requireAuth].filter(Boolean)
  const adminGuard = [requireAuth, requireSuperadmin].filter(Boolean)

  router.get('/master/desa', ...readGuard, async (_request, response) => response.json(await service.listActiveDesa()))
  router.get('/master/desa/:desaId/cluster', ...readGuard, async (request, response) => response.json(await service.listActiveClusterByDesa(request.params.desaId)))
  router.get('/master/kategori', ...readGuard, async (_request, response) => response.json(await service.listActiveKategori()))
  router.get('/master/pekerjaan', ...readGuard, async (request, response) => response.json(await service.listActivePekerjaan(request.query.kategoriId)))
  router.get('/admin/kategori', ...adminGuard, async (_request, response) => response.json(await service.listAdminKategori()))
  router.get('/admin/integration/ftth/status', ...adminGuard, async (_request, response) => {
    try { return response.json(await service.integrationStatus()) } catch (error) { return sendError(error, response) }
  })
  router.post('/admin/integration/ftth/sync', ...adminGuard, async (_request, response) => {
    try { return response.json(await service.syncFtth()) } catch (error) { return sendError(error, response) }
  })
  for (const resource of ['projects', 'clusters', 'cluster-processes', 'users']) {
    router.get(`/admin/integration/ftth/${resource}`, ...adminGuard, async (request, response) => {
      try { return response.json(await service.listFtthResource(resource, request.query)) } catch (error) { return sendError(error, response) }
    })
  }

  for (const resource of ['desa', 'cluster', 'pekerjaan']) {
    router.get(`/admin/${resource}`, ...adminGuard, async (_request, response) => response.json(await service.listAdmin(resource)))
    router.post(`/admin/${resource}`, ...adminGuard, async (request, response) => {
      try {
        const result = await service.create(resource, request.body)
        return response.status(201).json(result)
      } catch (error) { return sendError(error, response) }
    })
    router.put(`/admin/${resource}/:id`, ...adminGuard, async (request, response) => {
      try { return response.json(await service.update(resource, request.params.id, request.body)) } catch (error) { return sendError(error, response) }
    })
    router.patch(`/admin/${resource}/:id/status`, ...adminGuard, async (request, response) => {
      try {
        const parsed = statusSchema.safeParse(request.body)
        if (!parsed.success) return response.status(400).json({ message: 'Status aktif harus boolean.', errors: { isActive: 'Status aktif harus boolean.' } })
        return response.json(await service.setActive(resource, request.params.id, parsed.data.isActive))
      } catch (error) { return sendError(error, response) }
    })
  }

  return router
}

export async function createProductionMasterRouter({ authService } = {}) {
  const [{ prisma }, { requireAuth, requireRole }] = await Promise.all([
    import('../../config/prisma.js'),
    import('../auth/auth.middleware.js'),
  ])
  const { createMasterService } = await import('./master.service.js')
  const [{ createFtthClient }, { createFtthSyncService }] = await Promise.all([
    import('../integration/ftth.client.js'),
    import('../integration/ftth-sync.service.js'),
  ])
  const ftthClient = createFtthClient()
  const ftthSyncService = createFtthSyncService({ prisma, client: ftthClient })
  const service = createMasterService({ prisma, ftthSyncService, ftthClient })
  const sessionService = authService || await (await import('../auth/auth.routes.js')).createProductionAuthService()
  return createMasterRouter({
    service,
    requireAuth: requireAuth({ authService: sessionService }),
    requireSuperadmin: requireRole('SUPERADMIN'),
  })
}
