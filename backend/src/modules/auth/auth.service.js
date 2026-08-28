export function authError(code) {
  const error = new Error(code)
  error.code = code
  return error
}

export function createAuthService({ userRepository, passwordHasher, tokenSigner, storage }) {
  async function resolveFotoUrl(path) {
    if (!path) return null
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    if (storage?.createSignedUrl) {
      try {
        return await storage.createSignedUrl(path, 86400)
      } catch {
        return path
      }
    }
    return path
  }

  return {
    async login({ username, password }) {
      const user = await userRepository.findByUsername(username.trim())
      if (!user || !user.isActive) throw authError('INVALID_CREDENTIALS')

      const passwordMatches = await passwordHasher.compare(password, user.passwordHash)
      if (!passwordMatches) throw authError('INVALID_CREDENTIALS')

      const fotoProfilUrl = await resolveFotoUrl(user.fotoProfil)
      const token = tokenSigner.sign({ userId: user.id, role: user.role })
      return {
        token,
        user: {
          id: user.id,
          nama: user.nama,
          username: user.username,
          role: user.role,
          fotoProfil: user.fotoProfil || null,
          fotoProfilUrl,
        },
      }
    },

    async readSession(token) {
      if (!token) throw authError('INVALID_SESSION')
      try {
        const payload = tokenSigner.verify(token)
        const user = await userRepository.findActiveById(payload.userId || payload.sub)
        if (!user || !user.isActive) throw new Error('inactive')
        const fotoProfilUrl = await resolveFotoUrl(user.fotoProfil)
        return {
          id: user.id,
          nama: user.nama,
          username: user.username,
          role: user.role,
          fotoProfil: user.fotoProfil || null,
          fotoProfilUrl,
        }
      } catch {
        throw authError('INVALID_SESSION')
      }
    },

    async logout() {
      return undefined
    },
  }
}
