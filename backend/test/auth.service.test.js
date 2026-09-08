import { describe, expect, it } from 'vitest'
import { createAuthService } from '../src/modules/auth/auth.service.js'

function createService(overrides = {}) {
  const mockFtth = {
    login: async ({ username, password }) => {
      if (username === 'ayu' && password === 'secret') {
        return {
          token: 'ftth-jwt-token',
          user: {
            id: 'user-1',
            username: 'ayu',
            full_name: 'Ayu',
            email: 'ayu@example.com',
            role: 'user',
            is_active: true,
          },
        }
      }
      if (username === 'inactive') {
        return {
          token: 'ftth-jwt-token',
          user: {
            id: 'user-2',
            username: 'inactive',
            full_name: 'Inactive User',
            email: 'inactive@example.com',
            role: 'user',
            is_active: false,
          },
        }
      }
      const err = new Error('Invalid credentials')
      err.status = 401
      throw err
    },
    ...overrides.ftthApi,
  }

  return createAuthService({
    ftthApi: mockFtth,
    secret: 'test-secret-key-12345678901234567890',
    tokenSigner: overrides.tokenSigner,
  })
}

describe('auth service with FTTH API', () => {
  it('logs in an active user with valid FTTH credentials', async () => {
    const service = createService()
    const result = await service.login({ username: 'ayu', password: 'secret' })
    expect(result.user.id).toBe('user-1')
    expect(result.user.role).toBe('PEGAWAI')
    expect(result.token).toBeDefined()
  })

  it('rejects wrong credentials with INVALID_CREDENTIALS', async () => {
    const service = createService()
    await expect(service.login({ username: 'ayu', password: 'wrong' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })
  })

  it('rejects inactive user with USER_INACTIVE', async () => {
    const service = createService()
    await expect(service.login({ username: 'inactive', password: 'secret' })).rejects.toMatchObject({
      code: 'USER_INACTIVE',
    })
  })

  it('verifies valid session token', async () => {
    const service = createService()
    const { token } = await service.login({ username: 'ayu', password: 'secret' })
    const session = await service.readSession(token)
    expect(session).toMatchObject({
      id: 'user-1',
      username: 'ayu',
      role: 'PEGAWAI',
    })
  })
})
