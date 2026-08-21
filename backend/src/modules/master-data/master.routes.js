import { Router } from 'express'
import { statusSchema } from './master.schemas.js'

function sendError(error, response) {
  const statuses = { VALIDATION: 400, DUPLICATE: 409, INACTIVE_PARENT: 422, NOT_FOUND: 404 }
  return response.status(statuses[error.code] || 500).json({ error: error.message || 'Terjadi kesalahan pada server.' })
}

export function createMasterRouter({ service, requireAuth, requireSuperadmin } = {}) {
  const router = Router()
  const readGuard = [requireAuth].filter(Boolean)
  const adminGuard = [requireAuth, requireSuperadmin].filter(Boolean)

  router.get('/master/desa', ...readGuard, async (_request, response) => response.json(await service.listActiveDesa()))
  router.get('/master/desa/:desaId/rw', ...readGuard, async (request, response) => response.json(await service.listActiveRwByDesa(request.params.desaId)))
  router.get('/master/tahapan', ...readGuard, async (_request, response) => response.json(await service.listActiveTahapan()))

  for (const resource of ['desa', 'rw', 'tahapan']) {
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
        if (!parsed.success) return response.status(400).json({ error: 'Status aktif harus boolean.' })
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
  const service = createMasterService({ prisma })
  const sessionService = authService || await (await import('../auth/auth.routes.js')).createProductionAuthService()
  return createMasterRouter({
    service,
    requireAuth: requireAuth({ authService: sessionService }),
    requireSuperadmin: requireRole('SUPERADMIN'),
  })
}
