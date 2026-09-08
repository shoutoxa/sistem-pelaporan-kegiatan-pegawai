import { expect, it, vi } from 'vitest'
import { createFtthAuthService } from '../src/modules/auth/ftth-auth.service.js'
function setup(clock = () => 1000, identitySource = 'local') {
  const remote = { id: 'company-id', username: 'pegawai', full_name: 'Pegawai', role: 'user', is_active: true }
  const jwt = `header.${Buffer.from(JSON.stringify({ exp: 7200 })).toString('base64url')}.signature`
  const fetchImpl = vi.fn().mockImplementation(async (url) => ({ ok: true, status: 200, json: async () => url.endsWith('/me') ? remote : ({ token: jwt, user: remote }) }))
  const client = { getUser: vi.fn().mockResolvedValue(remote) }
  const findMapping = vi.fn().mockResolvedValue({ user: { id: 'local-id', role: 'PEGAWAI', isActive: true } })
  const service = createFtthAuthService({ client, fetchImpl, findMapping, identitySource, clock, sessionStore: new Map() })
  return { service, remote, fetchImpl, findMapping, client }
}
it.each(['user', 'administrator'])('logs in a company %s without any local mapping', async (role) => {
  const { service, remote, findMapping } = setup(() => 1000, 'ftth')
  remote.role = role
  findMapping.mockRejectedValue(new Error('local database unavailable'))
  const result = await service.login({ username: 'test', password: 'test-only' })
  expect(result.user).toMatchObject({ id: remote.id, identitySource: 'ftth', role: role === 'user' ? 'PEGAWAI' : 'SUPERADMIN' })
  expect((await service.readSession(result.token)).id).toBe(remote.id)
  expect(findMapping).not.toHaveBeenCalled()
  remote.is_active = false
  await expect(service.readSession(result.token)).rejects.toThrow()
})
it('uses official login, whitelists user data, and revokes session on logout', async () => {
  const { service, fetchImpl } = setup()
  const result = await service.login({ username: ' pegawai ', password: 'test-only' })
  expect(fetchImpl).toHaveBeenCalledWith('https://ftth.digitak.id/ftth_api/auth/login', expect.objectContaining({ method: 'POST', body: JSON.stringify({ username: 'pegawai', password: 'test-only' }) }))
  expect(result.user).toMatchObject({ id: 'local-id', externalUserId: 'company-id', role: 'PEGAWAI' })
  expect((await service.readSession(result.token)).authSource).toBe('ftth')
  expect(fetchImpl).toHaveBeenLastCalledWith('https://ftth.digitak.id/ftth_api/auth/me', expect.objectContaining({ method: 'GET', redirect: 'error', headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer header\./) }) }))
  await service.logout(result.token)
  await expect(service.readSession(result.token)).rejects.toMatchObject({ code: 'INVALID_SESSION' })
})
it('supports administrators only with a matching active local role', async () => {
  const { service, remote, findMapping } = setup()
  remote.role = 'administrator'
  await expect(service.login({ username: 'admin', password: 'test-only' })).rejects.toMatchObject({ code: 'MAPPING_REQUIRED' })
  findMapping.mockResolvedValue({ user: { id: 'admin-local', role: 'SUPERADMIN', isActive: true } })
  const result = await service.login({ username: 'admin', password: 'test-only' })
  expect((await service.readSession(result.token)).role).toBe('SUPERADMIN')
  findMapping.mockResolvedValue({ user: { id: 'admin-local', role: 'SUPERADMIN', isActive: false } })
  await expect(service.readSession(result.token)).rejects.toMatchObject({ code: 'MAPPING_REQUIRED' })
  await expect(service.readSession(result.token)).rejects.toMatchObject({ code: 'INVALID_SESSION' })
})
it('expires sessions after one hour without querying the company API', async () => {
  let now = 1000
  const { service, client } = setup(() => now)
  const result = await service.login({ username: 'pegawai', password: 'test-only' })
  expect(result.maxAge).toBe(3600000)
  now += 3600000
  await expect(service.readSession(result.token)).rejects.toMatchObject({ code: 'INVALID_SESSION' })
  expect(client.getUser).not.toHaveBeenCalled()
})
it('does not fall back to local credentials when the login server is unavailable', async () => {
  const { service, fetchImpl, findMapping } = setup()
  fetchImpl.mockRejectedValueOnce(new Error('network failure'))
  await expect(service.login({ username: 'pegawai', password: 'test-only' })).rejects.toMatchObject({ code: 'AUTH_UNAVAILABLE' })
  expect(findMapping).not.toHaveBeenCalled()
})
it('rejects malformed or expired upstream tokens', async () => {
  const { service, fetchImpl, remote } = setup()
  for (const token of ['invalid', `header.${Buffer.from(JSON.stringify({ exp: 1 })).toString('base64url')}.signature`]) {
    fetchImpl.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ token, user: remote }) })
    await expect(service.login({ username: 'pegawai', password: 'test-only' })).rejects.toMatchObject({ code: 'AUTH_UNAVAILABLE' })
  }
})
it('revokes sessions if the external identity is remapped to another local account', async () => {
  const { service, findMapping } = setup()
  const result = await service.login({ username: 'pegawai', password: 'test-only' })
  findMapping.mockResolvedValue({ user: { id: 'different-local-id', role: 'PEGAWAI', isActive: true } })
  await expect(service.readSession(result.token)).rejects.toMatchObject({ code: 'INVALID_SESSION' })
  findMapping.mockResolvedValue({ user: { id: 'local-id', role: 'PEGAWAI', isActive: true } })
  await expect(service.readSession(result.token)).rejects.toMatchObject({ code: 'INVALID_SESSION' })
})
it('requires a fresh login after a role change even if local and remote roles match', async () => {
  const { service, remote, findMapping } = setup()
  const result = await service.login({ username: 'pegawai', password: 'test-only' })
  remote.role = 'administrator'
  findMapping.mockResolvedValue({ user: { id: 'local-id', role: 'SUPERADMIN', isActive: true } })
  await expect(service.readSession(result.token)).rejects.toMatchObject({ code: 'INVALID_SESSION' })
})
it('fails closed on wrong password or missing mapping', async () => {
  const { service, fetchImpl, findMapping } = setup()
  fetchImpl.mockResolvedValueOnce({ ok: false, status: 401 })
  await expect(service.login({ username: 'x', password: 'x' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  expect(findMapping).not.toHaveBeenCalled()
  findMapping.mockResolvedValue(null)
  await expect(service.login({ username: 'x', password: 'x' })).rejects.toMatchObject({ code: 'MAPPING_REQUIRED' })
})
it('revokes inactive users and denies unrecognized roles', async () => {
  const { service, remote } = setup()
  const result = await service.login({ username: 'x', password: 'x' })
  remote.is_active = false
  await expect(service.readSession(result.token)).rejects.toThrow()
  remote.is_active = true; remote.role = 'unknown'
  await expect(service.login({ username: 'x', password: 'x' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
})

it('revokes a session rejected by official auth/me permanently', async () => {
  const { service, fetchImpl, client } = setup()
  const result = await service.login({ username: 'pegawai', password: 'test-only' })
  fetchImpl.mockResolvedValueOnce({ ok: false, status: 401 })
  await expect(service.readSession(result.token)).rejects.toMatchObject({ code: 'INVALID_SESSION' })
  const calls = fetchImpl.mock.calls.length
  await expect(service.readSession(result.token)).rejects.toMatchObject({ code: 'INVALID_SESSION' })
  expect(fetchImpl).toHaveBeenCalledTimes(calls)
  expect(client.getUser).not.toHaveBeenCalled()
})

it('denies access during an upstream outage but allows retry with the same session', async () => {
  const { service, fetchImpl } = setup()
  const result = await service.login({ username: 'pegawai', password: 'test-only' })
  fetchImpl.mockRejectedValueOnce(new Error('timeout'))
  await expect(service.readSession(result.token)).rejects.toMatchObject({ code: 'AUTH_UNAVAILABLE' })
  fetchImpl.mockResolvedValueOnce({ ok: false, status: 500 })
  await expect(service.readSession(result.token)).rejects.toMatchObject({ code: 'AUTH_UNAVAILABLE' })
  expect((await service.readSession(result.token)).role).toBe('PEGAWAI')
})

it('revokes a session if auth/me returns a different account', async () => {
  const { service, fetchImpl, remote } = setup()
  const result = await service.login({ username: 'pegawai', password: 'test-only' })
  fetchImpl.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ...remote, id: 'someone-else' }) })
  await expect(service.readSession(result.token)).rejects.toMatchObject({ code: 'INVALID_SESSION' })
})
