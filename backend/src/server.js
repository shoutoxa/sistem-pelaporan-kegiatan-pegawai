import 'dotenv/config'
import { createApp } from './app.js'
import { runtimeConfig } from './config/env.js'
import { createProductionAuthRouter, createProductionAuthService } from './modules/auth/auth.routes.js'
import { createProductionMasterRouter } from './modules/master-data/master.routes.js'
import { createProductionReportRouter } from './modules/laporan/report.routes.js'

const hasDatabase = process.env.DATABASE_URL && process.env.JWT_SECRET
const authService = hasDatabase ? await createProductionAuthService() : undefined
const authRouter = authService ? await createProductionAuthRouter() : undefined
const masterRouter = authService ? await createProductionMasterRouter({ authService }) : undefined
const reportRouter = authService && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? await createProductionReportRouter({ authService })
  : undefined
const app = createApp({ authRouter, masterRouter, reportRouter })

app.listen(runtimeConfig.port, () => {
  console.log(`Backend berjalan di http://localhost:${runtimeConfig.port}`)
})
