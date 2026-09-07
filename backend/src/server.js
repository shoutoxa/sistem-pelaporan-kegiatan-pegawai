import '../load-env.js'
import { createApp } from './app.js'
import { runtimeConfig } from './config/env.js'
import { createAuthRouter, createProductionAuthRouter, createProductionAuthService } from './modules/auth/auth.routes.js'
import { createProductionMasterRouter } from './modules/master-data/master.routes.js'
import { createProductionReportRouter } from './modules/laporan/report.routes.js'
import { createProductionDashboardRouter } from './modules/dashboard/dashboard.routes.js'
import { createProductionPegawaiRouter } from './modules/pegawai/pegawai.routes.js'
import { createProductionExportRouter } from './modules/export/export.routes.js'

const authService = await createProductionAuthService()
const authRouter = createAuthRouter({ authService })
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
})

app.listen(runtimeConfig.port, () => {
  console.log(`Backend berjalan di http://localhost:${runtimeConfig.port}`)
  console.log('Auth: environment variables (ADMIN_USERNAME, ADMIN_PASSWORD)')
  console.log('Data: FTTH API (https://ftth.digitak.id/ftth_api)')
})
