import { Router } from 'express'
import multer from 'multer'
import { fileTypeFromBuffer } from 'file-type'
import { createLocalStorage, createSupabaseStorage } from './report.storage.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { files: 10, fileSize: 20_000_000 } })

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
  'application/vnd.google-earth.kmz',
  'application/vnd.google-earth.kml+xml',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/zip',
])

function sendError(error, response) {
  const statuses = { VALIDATION: 400, FILE_VALIDATION: 400, FILE_LIMIT: 413, DATE_VALIDATION: 422, EDIT_EXPIRED: 422, LOCKED: 423, FORBIDDEN: 403, REFERENCE_INVALID: 422, NOT_FOUND: 404, STORAGE_ERROR: 500, DATABASE_ERROR: 500 }
  const message = error.message || 'Terjadi kesalahan pada server.'
  return response.status(statuses[error.code] || 500).json({ message, ...(error.errors ? { errors: error.errors } : {}) })
}

export function createReportRouter({ reportService, requirePegawai, requireAuth, requireSuperadmin }) {
  const router = Router()
  const createGuard = requirePegawai ? (Array.isArray(requirePegawai) ? requirePegawai : [requirePegawai]) : []
  const detailGuard = requireAuth ? [requireAuth] : []
  const adminGuard = [requireAuth, requireSuperadmin].filter(Boolean)

  router.post('/laporan', (request, response, next) => { console.log('[DEBUG] POST /laporan hit, user:', request.user?.username); next() }, ...createGuard, (request, response, next) => upload.array('dokumentasi', 10)(request, response, (error) => {
    if (error) return sendError({ code: error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FILE_COUNT' ? 'FILE_LIMIT' : 'FILE_VALIDATION', message: error.code === 'LIMIT_FILE_SIZE' ? 'Ukuran setiap file maksimal 20 MB.' : 'File dokumentasi tidak valid.' }, response)
    return next()
  }), async (request, response) => {
    try {
      const files = await Promise.all((request.files || []).map(async (file) => {
        const detected = await fileTypeFromBuffer(file.buffer)
        if (!detected || !ALLOWED_MIME.has(detected.mime)) {
          const isImageClaim = file.mimetype?.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.originalname || '')
          const errorMsg = isImageClaim
            ? 'Format foto harus JPG, PNG, atau WEBP.'
            : 'Format file tidak diizinkan. Gunakan JPG, PNG, PDF, KMZ, KML, XLSX, atau ZIP.'
          const error = new Error(errorMsg)
          error.code = 'FILE_VALIDATION'
          error.errors = { dokumentasi: error.message }
          throw error
        }
        return { ...file, mimetype: detected.mime }
      }))
      const result = await reportService.createReport({ actor: request.user, fields: request.body, files })
      return response.status(201).json({ message: 'Laporan berhasil disimpan.', data: { id: result.id || result._id, createdAt: result.created_at || result.createdAt } })
    } catch (error) { console.error('[DEBUG] Create report error:', error.code, error.message, error.errors); return sendError(error, response) }
  })

  router.get('/laporan/:id', ...detailGuard, async (request, response) => {
    try { return response.json({ data: await reportService.getReportDetail({ actor: request.user, reportId: request.params.id }) }) } catch (error) { return sendError(error, response) }
  })

  router.put('/laporan/:id', ...createGuard, async (request, response) => {
    try { return response.json({ data: await reportService.updateReport({ actor: request.user, reportId: request.params.id, fields: request.body }) }) } catch (error) { return sendError(error, response) }
  })

  router.put('/admin/laporan/:id', ...adminGuard, async (request, response) => {
    try { return response.json({ data: await reportService.updateReportByAdmin({ actor: request.user, reportId: request.params.id, fields: request.body }) }) } catch (error) { return sendError(error, response) }
  })

  router.patch('/admin/laporan/:id/status', ...adminGuard, async (request, response) => {
    try {
      const { status, catatanRevisi } = request.body
      return response.json({ data: await reportService.updateReportStatus({ reportId: request.params.id, fields: { status, catatanRevisi }, actor: request.user }) })
    } catch (error) { return sendError(error, response) }
  })

  router.delete('/admin/laporan/:id', ...adminGuard, async (request, response) => {
    try { return response.json({ data: await reportService.deleteReport({ actor: request.user, reportId: request.params.id }) }) } catch (error) { return sendError(error, response) }
  })

  return router
}

export async function createProductionReportRouter() {
  const [{ requireAuth, requireRole }, { createReportService }] = await Promise.all([
    import('../auth/auth.middleware.js'),
    import('./report.service.js'),
  ])
  const { createProductionAuthService } = await import('../auth/auth.routes.js')
  const sessionService = await createProductionAuthService()

  let storage
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)
      const { createSupabaseStorage: createSS } = await import('./report.storage.js')
      storage = createSS({ client: supabase, bucket: 'laporan' })
    } catch (e) {
      console.warn('Supabase not available, using local storage:', e.message)
      storage = createLocalStorage()
    }
  } else {
    storage = createLocalStorage()
    console.log('Using local file storage for uploads')
  }

  const reportService = createReportService({ storage })

  return createReportRouter({
    reportService,
    requireAuth: requireAuth({ authService: sessionService }),
    requirePegawai: [requireAuth({ authService: sessionService }), requireRole('PEGAWAI')],
    requireSuperadmin: requireRole('SUPERADMIN'),
  })
}
