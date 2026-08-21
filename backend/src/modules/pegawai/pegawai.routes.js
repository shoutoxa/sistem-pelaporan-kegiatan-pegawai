import { Router } from 'express'

export function createPegawaiRouter({ service, requireAuth, requireSuperadmin } = {}) {
  const router = Router()
  const guard = [requireAuth, requireSuperadmin].filter(Boolean)
  router.get('/admin/pegawai', ...guard, async (_request, response) => response.json({ data: await service.list() }))
  router.patch('/admin/pegawai/:id/status', ...guard, async (request, response) => response.json({ data: await service.setActive(request.params.id, request.body.isActive) }))
  return router
}

export async function createProductionPegawaiRouter({ authService } = {}) {
  const [{ prisma }, { requireAuth, requireRole }, { createPegawaiService }] = await Promise.all([import('../../config/prisma.js'), import('../auth/auth.middleware.js'), import('./pegawai.service.js')])
  const sessionService = authService || await (await import('../auth/auth.routes.js')).createProductionAuthService()
  return createPegawaiRouter({ service: createPegawaiService({ prisma }), requireAuth: requireAuth({ authService: sessionService }), requireSuperadmin: requireRole('SUPERADMIN') })
}
