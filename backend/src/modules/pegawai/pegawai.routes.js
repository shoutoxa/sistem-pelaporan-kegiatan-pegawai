import { Router } from 'express'
import multer from 'multer'
import { ftthApi } from '../../services/ftthApi.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10_000_000 } })

function sendError(error, response) {
  const statuses = { VALIDATION: 400, DUPLICATE: 409, NOT_FOUND: 404, FORBIDDEN: 403 }
  const message = error.message || 'Terjadi kesalahan pada server.'
  return response.status(statuses[error.code] || 500).json({ message })
}

export function createPegawaiRouter({ service, requireAuth, requireSuperadmin } = {}) {
  const router = Router()
  const guard = [requireAuth, requireSuperadmin].filter(Boolean)
  const authGuard = [requireAuth].filter(Boolean)

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
          wajibLapor: Boolean(u.wajib_lapor),
          fotoProfil: u.foto,
          fotoProfilUrl: u.foto ? (u.foto.startsWith('http') ? u.foto : `https://ftth.digitak.id${u.foto}`) : null,
        }))
      return response.json({ data: formattedUsers })
    } catch (error) {
      console.error('Error fetching users from FTTH:', error.message)
      return sendError({ code: 'NOT_FOUND', message: 'Gagal mengambil data pegawai dari FTTH.' }, response)
    }
  })

  router.get('/admin/pegawai/:id/clusters', ...guard, async (request, response) => {
    try {
      const clusters = await ftthApi.getUserClusters(request.params.id)
      return response.json({ data: Array.isArray(clusters) ? clusters : (clusters?.data || []) })
    } catch (error) {
      return sendError({ code: 'NOT_FOUND', message: 'Gagal mengambil cluster pegawai.' }, response)
    }
  })

  router.get('/admin/pegawai/:id/laporan-status', ...guard, async (request, response) => {
    try {
      const status = await ftthApi.getUserLaporanStatus(request.params.id)
      return response.json({ data: status?.data || status })
    } catch (error) {
      return sendError({ code: 'NOT_FOUND', message: 'Gagal mengambil status laporan pegawai.' }, response)
    }
  })

  router.post('/admin/pegawai/:id/foto', ...guard, upload.single('fotoProfil'), async (request, response) => {
    try {
      if (!request.file) {
        return response.status(400).json({ message: 'File foto tidak ditemukan.' })
      }
      const result = await ftthApi.uploadUserPhoto(
        request.params.id,
        request.file.buffer,
        request.file.originalname,
        request.file.mimetype,
      )
      return response.json({ message: 'Foto profil pegawai berhasil diperbarui.', data: result })
    } catch (error) {
      console.error('Error uploading employee photo:', error.message)
      return sendError({ code: 'NOT_FOUND', message: 'Gagal mengunggah foto: ' + error.message }, response)
    }
  })

  router.put('/admin/clusters/:id/pic', ...guard, async (request, response) => {
    try {
      const picId = request.body.picId || request.body.pic_id
      const result = await ftthApi.updateCluster(request.params.id, { pic_id: picId })
      return response.json({ message: 'PIC cluster berhasil diperbarui.', data: result })
    } catch (error) {
      return sendError({ code: 'NOT_FOUND', message: 'Gagal memperbarui PIC cluster: ' + error.message }, response)
    }
  })

  router.get('/pegawai/clusters', ...authGuard, async (request, response) => {
    try {
      const userId = request.user?.id
      if (!userId) return response.status(401).json({ message: 'Tidak terautentikasi' })
      const clusters = await ftthApi.getUserClusters(userId)
      return response.json({ data: Array.isArray(clusters) ? clusters : (clusters?.data || []) })
    } catch (error) {
      return sendError({ code: 'NOT_FOUND', message: 'Gagal mengambil data cluster pegawai.' }, response)
    }
  })

  router.get('/pegawai/laporan-status', ...authGuard, async (request, response) => {
    try {
      const userId = request.user?.id
      if (!userId) return response.status(401).json({ message: 'Tidak terautentikasi' })
      const status = await ftthApi.getUserLaporanStatus(userId)
      return response.json({ data: status?.data || status })
    } catch {
      return response.json({ data: { user_id: request.user?.id, wajib_lapor: false, clusters: [] } })
    }
  })

  router.post('/pegawai/foto', ...authGuard, upload.single('fotoProfil'), async (request, response) => {
    try {
      const userId = request.user?.id
      if (!userId) return response.status(401).json({ message: 'Tidak terautentikasi' })
      if (!request.file) {
        return response.status(400).json({ message: 'File foto tidak ditemukan.' })
      }
      const result = await ftthApi.uploadUserPhoto(
        userId,
        request.file.buffer,
        request.file.originalname,
        request.file.mimetype,
      )
      return response.json({ message: 'Foto profil berhasil diperbarui.', data: result })
    } catch (error) {
      console.error('Error uploading user photo:', error.message)
      return sendError({ code: 'NOT_FOUND', message: 'Gagal mengunggah foto: ' + error.message }, response)
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
