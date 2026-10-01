import { describe, expect, it } from 'vitest'
import { createAuthService } from '../src/modules/auth/auth.service.js'

function createService(overrides = {}) {
  return createAuthService({
    userRepository: {
      findByUsername: async () => ({ id: 'user-1', nama: 'Ayu', username: 'ayu', role: 'PEGAWAI', isActive: true, passwordHash: 'hash' }),
      findActiveById: async (id) => ({ id, nama: 'Ayu', username: 'ayu', role: 'PEGAWAI', isActive: true }),
      ...overrides.userRepository,
    },
    passwordHasher: { compare: async () => true, ...overrides.passwordHasher },
    tokenSigner: { sign: () => 'signed-token', verify: () => ({ userId: 'user-1', role: 'PEGAWAI' }), ...overrides.tokenSigner },
  })
}

describe('auth service', () => {
  it('logs in an active user with a valid password', async () => {
    await expect(createService().login({ username: 'ayu', password: 'secret' })).resolves.toMatchObject({ token: 'signed-token', user: { id: 'user-1' } })
  })

  it('uses one public error for missing user and wrong password', async () => {
    const missingUser = createService({ userRepository: { findByUsername: async () => null } })
    const wrongPassword = createService({ passwordHasher: { compare: async () => false } })

    await expect(missingUser.login({ username: 'ayu', password: 'bad' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    await expect(wrongPassword.login({ username: 'ayu', password: 'bad' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })

  it('rejects an inactive user and an expired session', async () => {
    const inactive = createService({ userRepository: { findByUsername: async () => ({ isActive: false, passwordHash: 'hash' }) } })
    const expired = createService({ tokenSigner: { verify: () => { throw new Error('expired') } } })

    await expect(inactive.login({ username: 'ayu', password: 'secret' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    await expect(expired.readSession('expired-token')).rejects.toMatchObject({ code: 'INVALID_SESSION' })
  })
})
