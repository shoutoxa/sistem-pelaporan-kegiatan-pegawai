import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { createProductionAuthService } from '../src/modules/auth/auth.routes.js'
import { requireAuth, requireRole } from '../src/modules/auth/auth.middleware.js'

describe('security and auth guards', () => {
  it('throws error when JWT_SECRET is not configured', async () => {
    const originalSecret = process.env.JWT_SECRET
    delete process.env.JWT_SECRET
    try {
      await expect(createProductionAuthService()).rejects.toThrow('JWT_SECRET wajib dikonfigurasi')
    } finally {
      process.env.JWT_SECRET = originalSecret
    }
  })

  it('rejects unauthenticated access to /api/ftth/reports and /api/ftth/mappings', async () => {
    const authService = {
      readSession: async () => null,
      verifyToken: async () => null,
    }
    const app = createApp({
      requireAuth: requireAuth({ authService }),
      requireSuperadmin: requireRole('SUPERADMIN'),
    })

    const reportsRes = await request(app).get('/api/ftth/reports')
    expect(reportsRes.status).toBe(401)

    const mappingsRes = await request(app).get('/api/ftth/mappings')
    expect(mappingsRes.status).toBe(401)
  })

  it('rejects PEGAWAI access to /api/ftth/mappings with 403 Forbidden', async () => {
    const authService = {
      readSession: async () => ({ id: 'pegawai-1', role: 'PEGAWAI', username: 'pegawai' }),
      verifyToken: async () => ({ userId: 'pegawai-1', role: 'PEGAWAI', username: 'pegawai' }),
    }
    const app = createApp({
      requireAuth: requireAuth({ authService }),
      requireSuperadmin: requireRole('SUPERADMIN'),
    })

    const mappingsRes = await request(app)
      .get('/api/ftth/mappings')
      .set('Cookie', ['session=pegawai-token'])
    expect(mappingsRes.status).toBe(403)

    const statusRes = await request(app)
      .patch('/api/ftth/reports/123/status')
      .set('Cookie', ['session=pegawai-token'])
      .send({ status: 'APPROVED' })
    expect(statusRes.status).toBe(403)

    const deleteRes = await request(app)
      .delete('/api/ftth/reports/123')
      .set('Cookie', ['session=pegawai-token'])
    expect(deleteRes.status).toBe(403)
  })

  it('supports Authorization Bearer header in requireAuth', async () => {
    const authService = {
      verifyToken: async (token) => token === 'valid-token' ? { userId: 'u1', role: 'PEGAWAI' } : null,
    }
    const app = createApp({
      requireAuth: requireAuth({ authService }),
    })

    const resValid = await request(app)
      .get('/api/ftth/references')
      .set('Authorization', 'Bearer valid-token')
    // 200 means authenticated successfully through requireAuth guard
    expect(resValid.status).toBe(200)

    const resInvalid = await request(app)
      .get('/api/ftth/references')
      .set('Authorization', 'Bearer invalid-token')
    expect(resInvalid.status).toBe(401)
  })

  it('authenticates via FTTH login endpoint and maps administrator to SUPERADMIN', async () => {
    const { ftthApi } = await import('../src/services/ftthApi.js')
    const originalLogin = ftthApi.login
    ftthApi.login = async ({ username }) => {
      if (username === 'admin') {
        return {
          token: 'ftth-jwt-token-sample',
          user: {
            id: 'e251e505-c7e0-411d-aff7-1107c69ed2b2',
            username: 'admin',
            email: 'admin@ftth2.com',
            full_name: 'Administrator',
            role: 'administrator',
            is_active: true,
          },
        }
      }
      const err = new Error('Invalid credentials')
      err.status = 401
      throw err
    }

    try {
      const authService = await createProductionAuthService()
      const result = await authService.login({ username: 'admin', password: 'anypassword' })
      expect(result.user.id).toBe('e251e505-c7e0-411d-aff7-1107c69ed2b2')
      expect(result.user.role).toBe('SUPERADMIN')
      expect(result.token).toBeDefined()
    } finally {
      ftthApi.login = originalLogin
    }
  })

  it('calls ftthApi.logout on logout endpoint', async () => {
    const { ftthApi } = await import('../src/services/ftthApi.js')
    const originalLogout = ftthApi.logout
    let logoutCalled = false
    ftthApi.logout = async () => {
      logoutCalled = true
      return { success: true }
    }

    try {
      const authService = await createProductionAuthService()
      await authService.logout('test-token')
      expect(logoutCalled).toBe(true)
    } finally {
      ftthApi.logout = originalLogout
    }
  })
})

