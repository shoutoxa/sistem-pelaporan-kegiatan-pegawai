import 'dotenv/config'
import { createApp } from './app.js'
import { runtimeConfig } from './config/env.js'
import { createProductionAuthRouter } from './modules/auth/auth.routes.js'

const authRouter = process.env.DATABASE_URL && process.env.JWT_SECRET
  ? await createProductionAuthRouter()
  : undefined
const app = createApp({ authRouter })

app.listen(runtimeConfig.port, () => {
  console.log(`Backend berjalan di http://localhost:${runtimeConfig.port}`)
})
