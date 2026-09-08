import request from 'supertest'
import { Router } from 'express'
import { expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { createAuthRouter } from '../src/modules/auth/auth.routes.js'
import { createFtthAuthService } from '../src/modules/auth/ftth-auth.service.js'
import { requireAuth, requireRole } from '../src/modules/auth/auth.middleware.js'

it('blocks company identities from local report routes while allowing FTTH routes', async () => {
  const authService = { readSession: vi.fn().mockResolvedValue({ id: 'company', role: 'SUPERADMIN', identitySource: 'ftth' }) }
  const app = createApp()
  const router = Router()
  router.use(requireAuth({ authService }))
  router.use((_req, res) => res.json({ ok: true }))
  app.use('/api', router)
  for (const path of ['/laporan', '/laporan/saya', '/admin/laporan/old-id', '/admin/laporan/export', '/master/desa', '/admin/cluster']) {
    expect((await request(app).get(`/api${path}`)).status).toBe(409)
  }
  for (const path of ['/ftth/reports', '/admin/laporan', '/admin/dokumentasi', '/admin/master-ftth']) {
    expect((await request(app).get(`/api${path}`)).status).toBe(200)
  }
})

it('returns 502 rather than an expired-session message when FTTH cannot verify the session', async () => {
  const service = { readSession: vi.fn().mockRejectedValue(Object.assign(new Error('upstream'), { code: 'AUTH_UNAVAILABLE' })) }
  const app = createApp({ authRouter: createAuthRouter({ authService: service }) })
  const response = await request(app).get('/api/auth/me').set('Cookie', 'session=opaque-test-id')
  expect(response.status).toBe(502)
  expect(response.body.message).toContain('belum dapat diverifikasi')
  expect(response.body.message).not.toContain('upstream')
})

it.each([['user', 'PEGAWAI', 403], ['administrator', 'SUPERADMIN', 200]])(
  'verifies cookie login, role access and logout for %s', async (remoteRole, localRole, accessStatus) => {
    const remote = { id: 'company-id', username: 'test-user', full_name: 'Test User', role: remoteRole, is_active: true, password_hash: 'must-not-leak' }
    const upstreamToken = `header.${Buffer.from(JSON.stringify({ exp: 7200 })).toString('base64url')}.signature`
    const service = createFtthAuthService({
      client: { getUser: vi.fn().mockResolvedValue(remote) },
      findMapping: vi.fn().mockResolvedValue({ user: { id: 'local-id', role: localRole, isActive: true } }),
      fetchImpl: vi.fn().mockImplementation(async (url) => ({ ok: true, status: 200, json: async () => url.endsWith('/me') ? remote : ({ token: upstreamToken, user: remote }) })),
      clock: () => 1000, sessionStore: new Map(),
    })
    const app = createApp({ authRouter: createAuthRouter({ authService: service }) })
    const protectedRouter = Router()
    protectedRouter.get('/', requireAuth({ authService: service }), requireRole('SUPERADMIN'), (_req, res) => res.json({ ok: true }))
    app.use('/test-admin-access', protectedRouter)
    const agent = request.agent(app)
    expect((await agent.get('/api/auth/me')).status).toBe(401)
    const login = await agent.post('/api/auth/login').send({ username: 'test-user', password: 'test-only' })
    expect(login.status).toBe(200)
    expect(login.body.user).toMatchObject({ role: localRole, authSource: 'ftth' })
    expect(JSON.stringify(login.body)).not.toContain('must-not-leak')
    expect(JSON.stringify(login.body)).not.toContain(upstreamToken)
    const cookie = login.headers['set-cookie'][0]
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
    expect(cookie).toMatch(/Max-Age=3600/i)
    expect((await agent.get('/api/auth/me')).status).toBe(200)
    expect((await agent.get('/test-admin-access')).status).toBe(accessStatus)
    expect((await agent.post('/api/auth/logout')).status).toBe(204)
    expect((await request(app).get('/api/auth/me').set('Cookie', cookie.split(';')[0])).status).toBe(401)
  },
)
