import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import { createHealthRouter } from './modules/health/health.routes.js'
import { runtimeConfig } from './config/env.js'

export function createApp({ healthCheck, authRouter, masterRouter, reportRouter, dashboardRouter } = {}) {
  const app = express()
  const resolvedHealthCheck = healthCheck || (async () => {
    if (!process.env.DATABASE_URL) return
    const { prisma } = await import('./config/prisma.js')
    await prisma.$queryRawUnsafe('SELECT 1')
  })

  app.use(helmet())
  app.use(cors({ origin: runtimeConfig.frontendOrigin, credentials: true }))
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api', createHealthRouter({ healthCheck: resolvedHealthCheck }))

  if (authRouter) app.use('/api/auth', authRouter)
  if (masterRouter) app.use('/api', masterRouter)
  if (dashboardRouter) app.use('/api', dashboardRouter)
  if (reportRouter) app.use('/api', reportRouter)

  app.use((error, _request, response, _next) => {
    console.error(error)
    return response.status(500).json({ error: 'Terjadi kesalahan pada server.' })
  })

  return app
}
