import '../load-env.js'
import { createApp } from './app.js'
import { runtimeConfig } from './config/env.js'
import { assertFullConfig } from './config/env.js'
import { createProductionAuthRouter, createProductionAuthService } from './modules/auth/auth.routes.js'
import { createProductionMasterRouter } from './modules/master-data/master.routes.js'
import { createProductionReportRouter } from './modules/laporan/report.routes.js'
import { createProductionDashboardRouter } from './modules/dashboard/dashboard.routes.js'
import { createProductionPegawaiRouter } from './modules/pegawai/pegawai.routes.js'
import { createProductionExportRouter } from './modules/export/export.routes.js'

const hasDatabase = process.env.DATABASE_URL && process.env.JWT_SECRET
if (process.env.REQUIRE_FULL_CONFIG === 'true') assertFullConfig()
const authService = hasDatabase ? await createProductionAuthService() : undefined
const authRouter = authService ? await createProductionAuthRouter() : undefined
const masterRouter = authService ? await createProductionMasterRouter({ authService }) : undefined
const hasStorageKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const reportRouter = authService && process.env.SUPABASE_URL && hasStorageKey
  ? await createProductionReportRouter({ authService })
  : undefined
const dashboardRouter = authService ? await createProductionDashboardRouter({ authService }) : undefined
const pegawaiRouter = authService ? await createProductionPegawaiRouter({ authService }) : undefined
const exportRouter = authService ? await createProductionExportRouter({ authService }) : undefined
const app = createApp({ authRouter, masterRouter, reportRouter, dashboardRouter: [dashboardRouter, pegawaiRouter, exportRouter].filter(Boolean) })

if (hasDatabase) {
  try {
    const { prisma } = await import('./config/prisma.js')
    await prisma.$queryRawUnsafe('SELECT 1')
  } catch (error) {
    console.warn('Peringatan: Warmup database awal terlewati:', error.message)
  }
}

app.listen(runtimeConfig.port, () => {
  console.log(`Backend berjalan di http://localhost:${runtimeConfig.port}`)
})
