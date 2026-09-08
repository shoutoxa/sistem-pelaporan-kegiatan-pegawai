import { Router } from 'express'
import multer from 'multer'

const statuses = { VALIDATION: 400, FORBIDDEN: 403, MAPPING_REQUIRED: 409, WRITE_UNCONFIRMED: 409, NOT_FOUND: 404, LOCKED: 423,
  INTEGRATION_NOT_CONFIGURED: 503, INTEGRATION_UNAVAILABLE: 502, INTEGRATION_UNAUTHORIZED: 502, INTEGRATION_INVALID_RESPONSE: 502 }
function sendError(error, response) {
  const status = statuses[error.code]
  if (!status) console.error('FTTH operation failed', { code: error.code || 'INTERNAL' })
  return response.status(status || 500).json({ message: status ? error.message : 'Integrasi belum siap atau terjadi kesalahan penyimpanan. Periksa konfigurasi dan migration development.' })
}

export function createFtthReportRouter({ service, requireAuth, requireSuperadmin, enabled = false, reportsSource = 'local', documentationSource = 'local' }) {
  const router = Router()
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10000000, files: 5, fields: 6, fieldSize: 10000 } })
  const profileUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5000000, files: 1, fields: 2 } })
  const run = (fn, status = 200) => async (request, response) => {
    try { return response.status(status).json({ data: await fn(request) }) }
    catch (error) { return sendError(error, response) }
  }
  router.use('/ftth', requireAuth)
  router.get('/ftth/status', (_request, response) => response.json({ data: { enabled, reportsSource, documentationSource } }))
  router.use('/ftth', (_request, response, next) => enabled ? next() : response.status(503).json({ message: 'Mode FTTH development belum diaktifkan pada backend.' }))
  router.get('/ftth/references', run((r) => service.references(r.user)))
  router.get('/ftth/mappings', requireSuperadmin, run((r) => service.mappings(r.user)))
  router.put('/ftth/mappings/:id', requireSuperadmin, run((r) => service.saveMapping(r.user, r.params.id, r.body)))
  router.get('/ftth/users/:id/foto', async (request, response) => {
    try {
      const file = await service.profilePhoto(request.user, request.params.id, { forceDownload: request.query.mode === 'download' })
      response.setHeader('Content-Type', file.mimeType)
      response.setHeader('Content-Disposition', `${file.forceDownload ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(file.filename)}`)
      return response.send(file.buffer)
    } catch (error) { return sendError(error, response) }
  })
  router.post('/ftth/users/:id/foto', requireSuperadmin, (request, response, next) => {
    profileUpload.single('file')(request, response, (error) => error
      ? response.status(400).json({ message: 'Foto profil maksimal 5 MB dan hanya satu file.' }) : next())
  }, run((r) => service.uploadProfilePhoto(r.user, r.params.id, r.file)))
  router.get('/ftth/users/:id/clusters', run((r) => service.userClusters(r.user, r.params.id)))
  router.get('/ftth/users/:id/laporan-status', run((r) => service.userReportStatus(r.user, r.params.id)))
  router.get('/ftth/reports', run((r) => service.list(r.user, r.query)))
  router.get('/ftth/reports/:reportId/attachments/:attachmentId/download', async (request, response) => {
    try {
      const file = await service.download(request.user, request.params.reportId, request.params.attachmentId, { forceDownload: request.query.mode === 'download' })
      response.setHeader('Content-Type', file.mimeType)
      response.setHeader('Content-Disposition', `${file.forceDownload ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(file.filename)}`)
      return response.send(file.buffer)
    } catch (error) { return sendError(error, response) }
  })
  router.get('/ftth/reports/:id', run((r) => service.detail(r.user, r.params.id)))
  router.post('/ftth/reports', (request, response, next) => {
    upload.array('dokumentasi', 5)(request, response, (error) => error
      ? response.status(400).json({ message: 'Unggah maksimal 5 lampiran, masing-masing maksimal 10 MB.' }) : next())
  }, run((r) => service.create(r.user, r.body, r.files), 201))
  router.put('/ftth/reports/:id', requireSuperadmin, run((r) => service.update(r.user, r.params.id, r.body)))
  router.patch('/ftth/reports/:id/status', requireSuperadmin, run((r) => service.setStatus(r.user, r.params.id, r.body)))
  router.delete('/ftth/reports/:id', requireSuperadmin, run((r) => service.remove(r.user, r.params.id)))
  return router
}

export async function createProductionFtthReportRouter({ authService }) {
  const [{ prisma }, { requireAuth, requireRole }, { createFtthClient }, { createFtthRepository },
    { createFtthReportService }, { runtimeConfig }] = await Promise.all([
    import('../../config/prisma.js'), import('../auth/auth.middleware.js'), import('./ftth.client.js'),
    import('./ftth.repository.js'), import('./ftth-report.service.js'), import('../../config/env.js'),
  ])
  return createFtthReportRouter({
    // FTTH owns attachment bytes; this app journals writes and proxies the
    // authenticated company download endpoint.
    service: createFtthReportService({ client: createFtthClient(), repository: createFtthRepository(prisma) }),
    requireAuth: requireAuth({ authService }), requireSuperadmin: requireRole('SUPERADMIN'),
    enabled: runtimeConfig.ftthReportsEnabled || runtimeConfig.migration.reports === 'ftth' || runtimeConfig.migration.documentation === 'ftth',
    reportsSource: runtimeConfig.migration.reports,
    documentationSource: runtimeConfig.migration.documentation,
  })
}
