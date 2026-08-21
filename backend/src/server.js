import 'dotenv/config'
import { createApp } from './app.js'
import { runtimeConfig } from './config/env.js'

const app = createApp()

app.listen(runtimeConfig.port, () => {
  console.log(`Backend berjalan di http://localhost:${runtimeConfig.port}`)
})
