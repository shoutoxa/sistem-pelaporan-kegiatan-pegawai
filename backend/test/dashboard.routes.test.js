import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { createDashboardRouter } from '../src/modules/dashboard/dashboard.routes.js'

describe('dashboard routes', () => {
  it('requires Superadmin middleware for dashboard data', async () => {
    const deny = (_request, response) => response.status(403).json({ error: 'Anda tidak memiliki akses.' })
    const response = await request(createApp({ dashboardRouter: createDashboardRouter({ dashboardService: {}, historyService: {}, requireSuperadmin: deny }) })).get('/api/admin/dashboard')

    expect(response.status).toBe(403)
  })
})
