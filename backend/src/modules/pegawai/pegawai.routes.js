import { Router } from 'express'
import { ftthApi } from '../../services/ftthApi.js'

function sendError(error, response) {
  const statuses = { VALIDATION: 400, DUPLICATE: 409, NOT_FOUND: 404, FORBIDDEN: 403 }
  const message = error.message || 'Terjadi kesalahan pada server.'
  return response.status(statuses[error.code] || 500).json({ message })
}

export function createPegawaiRouter({ service, requireAuth, requireSuperadmin } = {}) {
  const router = Router()
  const guard = [requireAuth, requireSuperadmin].filter(Boolean)

  router.get('/admin/pegawai', ...guard, async (_request, response) => {
    try {
      const result = await ftthApi.getUsers()
      const users = Array.isArray(result) ? result : (result.data || [])
      const formattedUsers = users
        .filter(u => u.role !== 'administrator' && u.role !== 'SUPERADMIN')
        .map(u => ({
          id: u.id,
          username: u.username,
          nama: u.full_name || u.username,
          email: u.email,
          nomorHp: u.phone,
          role: 'PEGAWAI',
          isActive: u.is_active !== false,
          wajibLapor: true,
          fotoProfil: u.foto,
          fotoProfilUrl: u.foto ? (u.foto.startsWith('http') ? u.foto : `https://ftth.digitak.id${u.foto}`) : null,
        }))
      return response.json({ data: formattedUsers })
    } catch (error) {
      console.error('Error fetching users from FTTH:', error.message)
      return sendError({ code: 'NOT_FOUND', message: 'Gagal mengambil data pegawai dari FTTH.' }, response)
    }
  })

  router.post('/admin/pegawai', ...guard, async (request, response) => {
    if (service?.create) {
      try {
        const data = await service.create(request.body)
        return response.status(201).json({ data })
      } catch (error) {
        return sendError(error, response)
      }
    }
    return response.status(403).json({ message: 'Penambahan pegawai harus dilakukan melalui FTTH Core.' })
  })

  router.put('/admin/pegawai/:id', ...guard, async (request, response) => {
    if (service?.update) {
      try {
        const data = await service.update(request.params.id, request.body)
        return response.status(200).json({ data })
      } catch (error) {
        return sendError(error, response)
      }
    }
    return response.status(403).json({ message: 'Perubahan data pegawai harus dilakukan melalui FTTH Core.' })
  })

  router.patch('/admin/pegawai/:id/status', ...guard, async (request, response) => {
    if (typeof request.body?.isActive !== 'boolean') {
      return response.status(400).json({ message: 'Status aktif harus boolean.', errors: { isActive: 'Status aktif harus boolean.' } })
    }
    if (service?.setActive) {
      try {
        const data = await service.setActive(request.params.id, request.body.isActive)
        return response.status(200).json({ data })
      } catch (error) {
        return sendError(error, response)
      }
    }
    return response.status(403).json({ message: 'Perubahan status pegawai harus dilakukan melalui FTTH Core.' })
  })

  router.post('/admin/pegawai/:id/foto', ...guard, async (request, response) => {
    return response.status(403).json({ message: 'Upload foto pegawai harus dilakukan melalui FTTH Core.' })
  })

  router.post('/pegawai/foto', ...[requireAuth].filter(Boolean), async (_request, response) => {
    return response.status(403).json({ message: 'Anda tidak memiliki akses untuk mengubah foto profil.' })
  })

  return router
}

export async function createProductionPegawaiRouter() {
  const { requireAuth, requireRole } = await import('../auth/auth.middleware.js')
  const { createProductionAuthService } = await import('../auth/auth.routes.js')
  const sessionService = await createProductionAuthService()
  return createPegawaiRouter({
    requireAuth: requireAuth({ authService: sessionService }),
    requireSuperadmin: requireRole('SUPERADMIN'),
  })
}
