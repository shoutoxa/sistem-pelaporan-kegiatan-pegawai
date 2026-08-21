import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { createAuthRouter } from '../src/modules/auth/auth.routes.js'

describe('auth routes', () => {
  it('sets an HttpOnly session cookie after login', async () => {
    const authService = {
      login: async () => ({ token: 'signed-token', user: { id: 'u1', role: 'PEGAWAI', nama: 'Ayu', username: 'ayu' } }),
      readSession: async () => ({ id: 'u1', role: 'PEGAWAI', nama: 'Ayu', username: 'ayu' }),
      logout: async () => undefined,
    }

    const response = await request(createApp({ authRouter: createAuthRouter({ authService }) }))
      .post('/api/auth/login')
      .send({ username: 'ayu', password: 'secret' })

    expect(response.status).toBe(200)
    expect(response.body.user.role).toBe('PEGAWAI')
    expect(response.headers['set-cookie'][0]).toMatch(/session=signed-token/)
    expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/i)
  })

  it('returns a public error for invalid credentials', async () => {
    const authService = { login: async () => { const error = new Error('invalid'); error.code = 'INVALID_CREDENTIALS'; throw error } }
    const response = await request(createApp({ authRouter: createAuthRouter({ authService }) }))
      .post('/api/auth/login')
      .send({ username: 'ayu', password: 'bad' })

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Username atau password tidak valid.' })
  })
})
