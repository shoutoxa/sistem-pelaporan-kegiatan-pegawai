import { Router } from 'express'

function sendError(error, response) {
  const statuses = { VALIDATION: 400, DUPLICATE: 409, NOT_FOUND: 404 }
  const message = error.message || 'Terjadi kesalahan pada server.'
  return response.status(statuses[error.code] || 500).json({ message, ...(error.errors ? { errors: error.errors } : {}) })
}

export function createPegawaiRouter({ service, requireAuth, requireSuperadmin } = {}) {
  const router = Router()
  const guard = [requireAuth, requireSuperadmin].filter(Boolean)
  router.get('/admin/pegawai', ...guard, async (_request, response) => {
    try { return response.json({ data: await service.list() }) } catch (error) { return sendError(error, response) }
  })
  router.post('/admin/pegawai', ...guard, async (request, response) => {
    try { return response.status(201).json({ message: 'Pegawai berhasil ditambahkan.', data: await service.create(request.body) }) } catch (error) { return sendError(error, response) }
  })
  router.put('/admin/pegawai/:id', ...guard, async (request, response) => {
    try { return response.json({ message: 'Pegawai berhasil diperbarui.', data: await service.update(request.params.id, request.body) }) } catch (error) { return sendError(error, response) }
  })
  router.patch('/admin/pegawai/:id/status', ...guard, async (request, response) => {
    if (typeof request.body.isActive !== 'boolean') return response.status(400).json({ message: 'Status aktif harus boolean.', errors: { isActive: 'Status aktif harus boolean.' } })
    try { return response.json({ data: await service.setActive(request.params.id, request.body.isActive) }) } catch (error) { return sendError(error, response) }
  })
  return router
}

export async function createProductionPegawaiRouter({ authService } = {}) {
  const [{ prisma }, { requireAuth, requireRole }, { createPegawaiService }, bcrypt] = await Promise.all([import('../../config/prisma.js'), import('../auth/auth.middleware.js'), import('./pegawai.service.js'), import('bcryptjs')])
  const sessionService = authService || await (await import('../auth/auth.routes.js')).createProductionAuthService()
  return createPegawaiRouter({ service: createPegawaiService({ prisma, passwordHasher: { hash: bcrypt.default.hash } }), requireAuth: requireAuth({ authService: sessionService }), requireSuperadmin: requireRole('SUPERADMIN') })
}
