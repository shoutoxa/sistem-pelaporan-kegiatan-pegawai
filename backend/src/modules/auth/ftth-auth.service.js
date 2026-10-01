import { randomBytes, createHash } from 'node:crypto'

// Process-local sessions: restarting the backend logs everyone out. Upstream
// tokens stay in server memory only; the browser receives an opaque session ID.
const sessions = new Map()
const roles = { administrator: 'SUPERADMIN', user: 'PEGAWAI' }
const key = (token) => createHash('sha256').update(String(token || '')).digest('hex')
const fail = (code) => Object.assign(new Error(code), { code })
export function createFtthAuthService({ findMapping, identitySource = 'local', fetchImpl = fetch, clock = Date.now,
  loginUrl = 'https://ftth.digitak.id/ftth_api/auth/login', sessionStore = sessions }) {
  async function mappedUser(remote) {
    const role = Object.hasOwn(roles, remote?.role) ? roles[remote.role] : undefined
    if (!remote?.id || !role || remote.is_active !== true) throw fail('INVALID_CREDENTIALS')
    if (identitySource === 'ftth') return { id: remote.id, externalUserId: remote.id, username: remote.username,
      nama: remote.full_name || remote.username, role, authSource: 'ftth', identitySource: 'ftth' }
    const mapping = await findMapping(remote.id)
    if (!mapping?.user?.isActive || mapping.user.role !== role) throw fail('MAPPING_REQUIRED')
    return { id: mapping.user.id, externalUserId: remote.id, username: remote.username,
      nama: remote.full_name || remote.username, role, authSource: 'ftth' }
  }
  return {
    async login({ username, password }) {
      let response
      try {
        response = await fetchImpl(loginUrl, { method: 'POST', redirect: 'error',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ username: username.trim(), password }), signal: AbortSignal.timeout(10000) })
      } catch { throw fail('AUTH_UNAVAILABLE') }
      if ([400, 401, 403].includes(response.status)) throw fail('INVALID_CREDENTIALS')
      if (!response.ok) throw fail('AUTH_UNAVAILABLE')
      let result
      try { result = await response.json() } catch { throw fail('AUTH_UNAVAILABLE') }
      if (typeof result.token !== 'string' || !result.token) throw fail('AUTH_UNAVAILABLE')
      const user = await mappedUser(result.user)
      // The login response comes from the fixed HTTPS authority, not a user token.
      let expiry
      try { expiry = JSON.parse(Buffer.from(result.token.split('.')[1], 'base64url').toString()).exp * 1000 } catch { throw fail('AUTH_UNAVAILABLE') }
      if (!Number.isFinite(expiry) || expiry <= clock()) throw fail('AUTH_UNAVAILABLE')
      for (const [id, session] of sessionStore) if (session.expires <= clock()) sessionStore.delete(id)
      if (sessionStore.size >= 10000) throw fail('AUTH_UNAVAILABLE')
      const token = randomBytes(32).toString('base64url')
      sessionStore.set(key(token), { upstreamToken: result.token, externalUserId: user.externalUserId, localUserId: user.id, role: user.role, expires: Math.min(expiry, clock() + 3600000) })
      return { user, token, maxAge: Math.min(expiry - clock(), 3600000) }
    },
    async readSession(token) {
      const session = sessionStore.get(key(token))
      if (!session || session.expires <= clock()) { sessionStore.delete(key(token)); throw fail('INVALID_SESSION') }
      let response
      try {
        response = await fetchImpl('https://ftth.digitak.id/ftth_api/auth/me', {
          method: 'GET', redirect: 'error', headers: { Accept: 'application/json', Authorization: `Bearer ${session.upstreamToken}` },
          signal: AbortSignal.timeout(10000),
        })
      } catch { throw fail('AUTH_UNAVAILABLE') }
      if ([401, 403].includes(response.status)) {
        sessionStore.delete(key(token))
        throw fail('INVALID_SESSION')
      }
      if (!response.ok) throw fail('AUTH_UNAVAILABLE')
      let remote
      try { remote = await response.json() } catch { throw fail('AUTH_UNAVAILABLE') }
      try {
        if (remote?.id !== session.externalUserId) throw fail('INVALID_SESSION')
        const user = await mappedUser(remote)
        // A session must not silently become another local account or gain a role.
        if (user.id !== session.localUserId || user.role !== session.role) throw fail('INVALID_SESSION')
        return user
      } catch (error) { sessionStore.delete(key(token)); throw error }
    },
    async logout(token) { sessionStore.delete(key(token)) },
  }
}
