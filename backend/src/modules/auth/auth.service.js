import jwt from 'jsonwebtoken'
import { ftthApi as defaultFtthApi } from '../../services/ftthApi.js'

export function authError(code, message) {
  const error = new Error(message || code)
  error.code = code
  return error
}

export function createAuthService({
  ftthApi = defaultFtthApi,
  secret = process.env.JWT_SECRET,
  tokenSigner,
} = {}) {
  const jwtSecret = secret || process.env.JWT_SECRET

  function signToken(payload) {
    if (tokenSigner?.sign) return tokenSigner.sign(payload)
    if (!jwtSecret) throw authError('CONFIG_ERROR', 'JWT_SECRET belum dikonfigurasi.')
    return jwt.sign(
      {
        userId: payload.userId,
        username: payload.username,
        nama: payload.nama,
        role: payload.role,
        ftthToken: payload.ftthToken,
        sub: payload.userId,
      },
      jwtSecret,
      { expiresIn: '8h' }
    )
  }

  function verifyJwt(token) {
    if (tokenSigner?.verify) return tokenSigner.verify(token)
    if (!jwtSecret) throw authError('CONFIG_ERROR', 'JWT_SECRET belum dikonfigurasi.')
    const decoded = jwt.verify(token, jwtSecret)
    const role = decoded.role === 'administrator' || decoded.role === 'SUPERADMIN' ? 'SUPERADMIN' : 'PEGAWAI'
    return {
      userId: decoded.userId || decoded.id || decoded.sub,
      username: decoded.username,
      nama: decoded.nama || decoded.username,
      role,
      ftthToken: decoded.ftthToken,
    }
  }

  return {
    async login({ username, password }) {
      const cleanUsername = String(username || '').trim()
      const cleanPassword = String(password || '')

      if (!cleanUsername || !cleanPassword) {
        throw authError('VALIDATION', 'Username dan password wajib diisi.')
      }

      let ftthRes
      try {
        ftthRes = await ftthApi.login({ username: cleanUsername, password: cleanPassword })
      } catch (err) {
        if (err.status === 401 || err.code === 'INVALID_CREDENTIALS') {
          throw authError('INVALID_CREDENTIALS', 'Username atau password tidak valid.')
        }
        throw authError('INVALID_CREDENTIALS', 'Username atau password tidak valid.')
      }

      const data = ftthRes?.data || ftthRes
      if (!data || !data.user) {
        throw authError('INVALID_CREDENTIALS', 'Username atau password tidak valid.')
      }

      const ftthUser = data.user
      if (ftthUser.is_active === false) {
        throw authError('USER_INACTIVE', 'Akun tidak aktif.')
      }

      const role = ftthUser.role === 'administrator' || ftthUser.role === 'SUPERADMIN' ? 'SUPERADMIN' : 'PEGAWAI'
      const user = {
        id: ftthUser.id,
        username: ftthUser.username,
        nama: ftthUser.full_name || ftthUser.nama || ftthUser.username,
        email: ftthUser.email,
        role,
        isActive: Boolean(ftthUser.is_active),
        foto: ftthUser.foto || null,
        fotoProfilUrl: ftthUser.foto ? (ftthUser.foto.startsWith('http') ? ftthUser.foto : `https://ftth.digitak.id${ftthUser.foto}`) : null,
      }

      const token = signToken({
        userId: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
        ftthToken: data.token,
      })

      return { user, token }
    },

    async readSession(token) {
      if (!token) return null
      try {
        const decoded = verifyJwt(token)
        if (!decoded) return null
        return {
          id: decoded.userId,
          username: decoded.username || '',
          nama: decoded.nama || decoded.username || (decoded.role === 'SUPERADMIN' ? 'Superadmin' : 'Pegawai'),
          role: decoded.role,
        }
      } catch {
        return null
      }
    },

    async verifyToken(token) {
      try {
        return verifyJwt(token)
      } catch {
        return null
      }
    },

    async logout(token) {
      try {
        let ftthToken = token
        if (token) {
          try {
            const decoded = jwt.decode(token)
            if (decoded?.ftthToken) ftthToken = decoded.ftthToken
          } catch {
            // ignore
          }
        }
        if (typeof ftthApi.logout === 'function') {
          await ftthApi.logout(ftthToken).catch(() => null)
        }
      } catch {
        // ignore logout errors
      }
    },
  }
}
