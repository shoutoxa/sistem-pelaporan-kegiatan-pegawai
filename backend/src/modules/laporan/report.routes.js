import { Router } from 'express'
import multer from 'multer'
import { fileTypeFromBuffer } from 'file-type'

const upload = multer({ storage: multer.memoryStorage(), limits: { files: 5, fileSize: 10_000_000 } })

function sendError(error, response) {
  const statuses = { VALIDATION: 400, FILE_VALIDATION: 400, FILE_LIMIT: 413, DATE_VALIDATION: 422, EDIT_EXPIRED: 422, LOCKED: 423, FORBIDDEN: 403, REFERENCE_INVALID: 422, NOT_FOUND: 404, STORAGE_ERROR: 500, DATABASE_ERROR: 500 }
  const message = error.message || 'Terjadi kesalahan pada server.'
  return response.status(statuses[error.code] || 500).json({ message, ...(error.errors ? { errors: error.errors } : {}) })
}

export function createReportRouter({ reportService, requirePegawai, requireAuth, requireSuperadmin } = {}) {
  const router = Router()
  const createGuard = requirePegawai ? (Array.isArray(requirePegawai) ? requirePegawai : [requirePegawai]) : []
  const detailGuard = requireAuth ? [requireAuth] : []
  const adminGuard = [requireAuth, requireSuperadmin].filter(Boolean)

  router.post('/laporan', ...createGuard, (request, response, next) => upload.array('dokumentasi', 5)(request, response, (error) => {
    if (error) return sendError({ code: error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FILE_COUNT' ? 'FILE_LIMIT' : 'FILE_VALIDATION', message: error.code === 'LIMIT_FILE_SIZE' ? 'Ukuran setiap foto maksimal 10 MB.' : 'File dokumentasi tidak valid.' }, response)
    return next()
  }), async (request, response) => {
    try {
      const files = await Promise.all((request.files || []).map(async (file) => {
        const detected = await fileTypeFromBuffer(file.buffer)
        if (!detected || !['image/jpeg', 'image/png', 'image/webp'].includes(detected.mime)) {
          const error = new Error('Format foto harus JPG, PNG, atau WEBP.')
          error.code = 'FILE_VALIDATION'
          error.errors = { dokumentasi: error.message }
          throw error
        }
        return { ...file, mimetype: detected.mime }
      }))
      const result = await reportService.createReport({ actor: request.user, fields: request.body, files })
      return response.status(201).json({ message: 'Laporan berhasil disimpan.', data: { id: result.id, createdAt: result.createdAt } })
    } catch (error) { return sendError(error, response) }
  })

  router.get('/laporan/:id', ...detailGuard, async (request, response) => {
    try { return response.json({ data: await reportService.getReportDetail({ actor: request.user, reportId: request.params.id }) }) } catch (error) { return sendError(error, response) }
  })

  router.put('/laporan/:id', ...createGuard, async (request, response) => {
    try { return response.json({ data: await reportService.updateReport({ actor: request.user, reportId: request.params.id, fields: request.body }) }) } catch (error) { return sendError(error, response) }
  })

  router.put('/admin/laporan/:id', ...adminGuard, async (request, response) => {
    try { return response.json({ data: await reportService.updateReportByAdmin({ reportId: request.params.id, fields: request.body }) }) } catch (error) { return sendError(error, response) }
  })

  router.patch('/admin/laporan/:id/diterima', ...adminGuard, async (request, response) => {
    try {
      const { diterima } = request.body
      return response.json({ data: await reportService.updateDiterimaStatus({ reportId: request.params.id, diterima }) })
    } catch (error) { return sendError(error, response) }
  })

  return router
}

export async function createProductionReportRouter({ authService } = {}) {
  const [{ prisma }, { requireAuth, requireRole }, { createStorage }, { createReportService }] = await Promise.all([
    import('../../config/prisma.js'),
    import('../auth/auth.middleware.js'),
    import('./report.storage.js'),
    import('./report.service.js'),
  ])
  const sessionService = authService || await (await import('../auth/auth.routes.js')).createProductionAuthService()
  const storage = (await import('../../config/supabase.js')).createSupabaseStorage()
  const reportService = createReportService({ prisma, storage })
  return createReportRouter({
    reportService,
    requireAuth: requireAuth({ authService: sessionService }),
    requirePegawai: [requireAuth({ authService: sessionService }), requireRole('PEGAWAI')],
    requireSuperadmin: requireRole('SUPERADMIN'),
  })
}
