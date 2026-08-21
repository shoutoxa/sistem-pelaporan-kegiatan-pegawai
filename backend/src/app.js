import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import { createHealthRouter } from './modules/health/health.routes.js'
import { runtimeConfig } from './config/env.js'

export function createApp({ healthCheck, authRouter, masterRouter, reportRouter, dashboardRouter } = {}) {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: runtimeConfig.frontendOrigin, credentials: true }))
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api', createHealthRouter({ healthCheck }))

  if (authRouter) app.use('/api/auth', authRouter)
  if (masterRouter) app.use('/api/master', masterRouter)
  if (reportRouter) app.use('/api/reports', reportRouter)
  if (dashboardRouter) app.use('/api/dashboard', dashboardRouter)

  app.use((error, _request, response, _next) => {
    console.error(error)
    return response.status(500).json({ error: 'Terjadi kesalahan pada server.' })
  })

  return app
}
