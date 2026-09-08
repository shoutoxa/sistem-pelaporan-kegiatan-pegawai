import '../load-env.js'
import { createApp } from './app.js'
import { runtimeConfig } from './config/env.js'
import { createAuthRouter, createProductionAuthService } from './modules/auth/auth.routes.js'
import { createProductionMasterRouter } from './modules/master-data/master.routes.js'
import { createProductionReportRouter } from './modules/laporan/report.routes.js'
import { createProductionDashboardRouter } from './modules/dashboard/dashboard.routes.js'
import { createProductionPegawaiRouter } from './modules/pegawai/pegawai.routes.js'
import { createProductionExportRouter } from './modules/export/export.routes.js'

import { requireAuth, requireRole } from './modules/auth/auth.middleware.js'

const authService = await createProductionAuthService()
const authRouter = createAuthRouter({ authService })
const requireAuthGuard = requireAuth({ authService })
const requireSuperadminGuard = requireRole('SUPERADMIN')
const masterRouter = await createProductionMasterRouter({ authService })
const reportRouter = await createProductionReportRouter()
const dashboardRouter = await createProductionDashboardRouter()
const pegawaiRouter = await createProductionPegawaiRouter()
const exportRouter = await createProductionExportRouter()

const app = createApp({
  authRouter,
  masterRouter,
  reportRouter,
  dashboardRouter: [dashboardRouter, pegawaiRouter, exportRouter].filter(Boolean),
  requireAuth: requireAuthGuard,
  requireSuperadmin: requireSuperadminGuard,
})

app.listen(runtimeConfig.port, () => {
  console.log(`Backend berjalan di http://localhost:${runtimeConfig.port}`)
  console.log('Mode: Full FTTH Cloud API (tanpa database lama)')
  console.log('Data & Storage: FTTH API (https://ftth.digitak.id/ftth_api)')
})
