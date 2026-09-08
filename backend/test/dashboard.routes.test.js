import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { createDashboardRouter } from '../src/modules/dashboard/dashboard.routes.js'

describe('dashboard routes', () => {
  it('routes company reports without reading local history and never falls back on failure', async () => {
    const historyService = { listAdminReports: vi.fn() }
    const ftthReports = { listAdminReports: vi.fn().mockResolvedValue({ source: 'ftth', items: [], total: 0 }) }
    const app = createApp({ dashboardRouter: createDashboardRouter({ historyService, ftthReports }) })
    expect((await request(app).get('/api/admin/laporan')).body.data.source).toBe('ftth')
    ftthReports.listAdminReports.mockRejectedValue(Object.assign(new Error('API gagal'), { code: 'INTEGRATION_UNAVAILABLE' }))
    expect((await request(app).get('/api/admin/laporan')).status).toBe(502)
    expect(historyService.listAdminReports).not.toHaveBeenCalled()
  })
  it('blocks employee access before calling company reports', async () => {
    const ftthReports = { listAdminReports: vi.fn() }
    const deny = (_req, res) => res.sendStatus(403)
    const app = createApp({ dashboardRouter: createDashboardRouter({ ftthReports, requireSuperadmin: deny }) })
    expect((await request(app).get('/api/admin/laporan')).status).toBe(403)
    expect(ftthReports.listAdminReports).not.toHaveBeenCalled()
  })
  it('requires Superadmin middleware for dashboard data', async () => {
    const deny = (_request, response) => response.status(403).json({ error: 'Anda tidak memiliki akses.' })
    const response = await request(createApp({ dashboardRouter: createDashboardRouter({ dashboardService: {}, historyService: {}, requireSuperadmin: deny }) })).get('/api/admin/dashboard')

    expect(response.status).toBe(403)
  })
})
