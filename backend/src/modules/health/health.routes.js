import { Router } from 'express'

export function createHealthRouter({ healthCheck = async () => true } = {}) {
  const router = Router()

  router.get('/health', async (_request, response) => {
    try {
      await healthCheck()
      return response.json({ status: 'ok', database: 'up' })
    } catch {
      return response.status(503).json({ status: 'error', database: 'down' })
    }
  })

  return router
}
