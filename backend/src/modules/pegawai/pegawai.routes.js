import { Router } from 'express'
import multer from 'multer'
import { fileTypeFromBuffer } from 'file-type'

const photoUpload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: 5_000_000 } })

function sendError(error, response) {
  const statuses = { VALIDATION: 400, DUPLICATE: 409, NOT_FOUND: 404, FORBIDDEN: 403 }
  const message = error.message || 'Terjadi kesalahan pada server.'
  return response.status(statuses[error.code] || 500).json({ message, ...(error.errors ? { errors: error.errors } : {}) })
}

export function createPegawaiRouter({ service, requireAuth, requireSuperadmin } = {}) {
  const router = Router()
  const guard = [requireAuth, requireSuperadmin].filter(Boolean)
  const authGuard = requireAuth ? [requireAuth] : []

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

  // Profile photo upload - ONLY SUPERADMIN (enforced by route guard and service logic)
  router.post('/admin/pegawai/:id/foto', ...guard, (request, response, next) => photoUpload.single('fotoProfil')(request, response, (error) => {
    if (error) return sendError({ code: 'VALIDATION', message: 'Ukuran foto profil maksimal 5 MB.' }, response)
    return next()
  }), async (request, response) => {
    try {
      const file = request.file
      if (!file) return response.status(400).json({ message: 'Foto profil wajib diunggah.' })
      const detected = await fileTypeFromBuffer(file.buffer)
      if (!detected || !['image/jpeg', 'image/png', 'image/webp'].includes(detected.mime)) {
        return response.status(400).json({ message: 'Format foto harus JPG, PNG, atau WEBP.' })
      }
      const data = await service.updatePhoto({ actor: request.user, targetUserId: request.params.id, file: { ...file, mimetype: detected.mime } })
      return response.json({ message: 'Foto profil berhasil diperbarui.', data })
    } catch (error) { return sendError(error, response) }
  })

  // Explicit route for PEGAWAI attempts to change photo -> MUST BE FORBIDDEN (403)
  router.post('/pegawai/foto', ...authGuard, (_request, response) => {
    return response.status(403).json({ message: 'Anda tidak memiliki akses untuk mengubah foto profil.' })
  })

  return router
}

export async function createProductionPegawaiRouter({ authService } = {}) {
  const [{ prisma }, { requireAuth, requireRole }, { createPegawaiService }, bcrypt] = await Promise.all([import('../../config/prisma.js'), import('../auth/auth.middleware.js'), import('./pegawai.service.js'), import('bcryptjs')])
  const sessionService = authService || await (await import('../auth/auth.routes.js')).createProductionAuthService()
  const storage = (await import('../../config/supabase.js')).createSupabaseStorage()
  return createPegawaiRouter({ service: createPegawaiService({ prisma, passwordHasher: { hash: bcrypt.default.hash }, storage }), requireAuth: requireAuth({ authService: sessionService }), requireSuperadmin: requireRole('SUPERADMIN') })
}
