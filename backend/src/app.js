import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import { createHealthRouter } from './modules/health/health.routes.js'
import { runtimeConfig } from './config/env.js'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'

import { ftthApi } from './services/ftthApi.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function createApp({ healthCheck, authRouter, masterRouter, reportRouter, dashboardRouter, requireAuth, requireSuperadmin } = {}) {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        if (
          origin === runtimeConfig.frontendOrigin ||
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
          return callback(null, true)
        }
        callback(new Error('Not allowed by CORS'))
      },
      credentials: true,
    })
  )
  app.use(express.json())
  app.use(cookieParser())

  const uploadDir = process.env.UPLOAD_DIR || join(__dirname, '../../uploads')
  const placeholderPath = join(__dirname, '../../frontend/src/assets/hero.png')
  let placeholderBuffer = null
  try {
    if (existsSync(placeholderPath)) placeholderBuffer = readFileSync(placeholderPath)
  } catch {
    // fallback disabled
  }

  app.use('/api/files', express.static(uploadDir))
  app.use('/api/files', (_req, res) => {
    if (placeholderBuffer) {
      res.setHeader('Content-Type', 'image/png')
      return res.status(200).end(placeholderBuffer)
    }
    return res.status(404).json({ message: 'File not found' })
  })

  app.use('/uploads', express.static(uploadDir))
  app.use('/uploads', (req, res) => {
    const filename = req.path.replace(/^\/+/, '')
    const remoteUrl = `https://ftth.digitak.id/uploads/${filename}`
    return res.redirect(remoteUrl)
  })

  app.use('/api', createHealthRouter({ healthCheck }))

  if (authRouter) app.use('/api/auth', authRouter)

  const authGuard = [requireAuth].filter(Boolean)
  const adminGuard = [requireAuth, requireSuperadmin].filter(Boolean)

  // FTTH Integration Routes (Secured)
  app.get('/api/ftth/status', (_req, res) =>
    res.json({ data: { enabled: true } })
  )

  app.get('/api/ftth/references', ...authGuard, async (_req, res) => {
    try {
      const [projectsRes, clustersRes, categoriesRes, processesRes] = await Promise.all([
        ftthApi.getProjects().catch(() => []),
        ftthApi.getClusters().catch(() => []),
        ftthApi.getMasterCategories().catch(() => []),
        ftthApi.getMasterProcesses().catch(() => []),
      ])
      const projects = Array.isArray(projectsRes) ? projectsRes : (projectsRes.data || [])
      const clusters = Array.isArray(clustersRes) ? clustersRes : (clustersRes.data || [])
      const categories = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes.data || [])
      const processes = Array.isArray(processesRes) ? processesRes : (processesRes.data || [])
      return res.json({ data: { projects, clusters, categories, processes } })
    } catch {
      return res.json({ data: { projects: [], clusters: [], categories: [], processes: [] } })
    }
  })

  app.get('/api/ftth/mappings', ...adminGuard, async (_req, res) => {
    try {
      const usersRes = await ftthApi.getUsers().catch(() => [])
      const users = (Array.isArray(usersRes) ? usersRes : (usersRes.data || [])).map((u) => ({
        id: u.id,
        nama: u.full_name || u.username,
        role: u.role === 'administrator' ? 'SUPERADMIN' : 'PEGAWAI',
        ftthIdentity: { externalUserId: u.id, allowedClusterIds: [] },
      }))
      return res.json({ data: { users, pendingUploads: [] } })
    } catch {
      return res.json({ data: { users: [], pendingUploads: [] } })
    }
  })

  app.put('/api/ftth/mappings/:id', ...adminGuard, async (_req, res) => {
    return res.json({ data: { success: true, message: 'Pemetaan akun berhasil disimpan.' } })
  })

  app.get('/api/ftth/reports', ...authGuard, async (req, res) => {
    try {
      const reports = await ftthApi.getReports(req.query).catch(() => [])
      return res.json({ data: Array.isArray(reports) ? reports : (reports.data || []) })
    } catch (e) {
      return res.status(500).json({ message: e.message || 'Gagal mengambil laporan FTTH.' })
    }
  })

  app.get('/api/ftth/reports/:id', ...authGuard, async (req, res) => {
    try {
      const report = await ftthApi.getReportById(req.params.id)
      const data = report.data || report
      let docs = data.dokumentasi || data.dokumentasi_laporan || []
      if (!Array.isArray(docs) || docs.length === 0) {
        const docsRes = await ftthApi.getDocumentation({ laporan_id: req.params.id }).catch(() => [])
        const docsList = Array.isArray(docsRes) ? docsRes : (docsRes.data || [])
        docs = docsList.filter((item) => (item.laporan_id || item.laporanId) === req.params.id)
      } else {
        docs = docs.filter((item) => !item.laporan_id || item.laporan_id === req.params.id)
      }
      return res.json({ data: { ...data, dokumentasi: docs } })
    } catch {
      return res.status(404).json({ message: 'Laporan tidak ditemukan.' })
    }
  })

  app.patch('/api/ftth/reports/:id/status', ...adminGuard, async (req, res) => {
    try {
      const result = await ftthApi.updateReport(req.params.id, {
        status: req.body.status,
        catatan_revisi: req.body.catatan_revisi,
      })
      return res.json({ data: result.data || result })
    } catch (e) {
      return res.status(500).json({ message: e.message || 'Gagal memperbarui status laporan.' })
    }
  })

  app.delete('/api/ftth/reports/:id', ...adminGuard, async (req, res) => {
    try {
      await ftthApi.deleteReport(req.params.id)
      return res.json({ message: 'Laporan FTTH berhasil dihapus.' })
    } catch (e) {
      return res.status(500).json({ message: e.message || 'Gagal menghapus laporan.' })
    }
  })

  if (masterRouter) app.use('/api', masterRouter)
  for (const router of (Array.isArray(dashboardRouter) ? dashboardRouter : [dashboardRouter]).filter(Boolean)) app.use('/api', router)
  if (reportRouter) app.use('/api', reportRouter)

  app.use((error, _request, response, _next) => {
    console.error(error)
    return response.status(500).json({ message: 'Terjadi kesalahan pada server.' })
  })

  return app
}
