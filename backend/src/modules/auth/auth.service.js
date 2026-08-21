export function authError(code) {
  const error = new Error(code)
  error.code = code
  return error
}

export function createAuthService({ userRepository, passwordHasher, tokenSigner }) {
  return {
    async login({ username, password }) {
      const user = await userRepository.findByUsername(username.trim())
      if (!user || !user.isActive) throw authError('INVALID_CREDENTIALS')

      const passwordMatches = await passwordHasher.compare(password, user.passwordHash)
      if (!passwordMatches) throw authError('INVALID_CREDENTIALS')

      const token = tokenSigner.sign({ userId: user.id, role: user.role })
      return {
        token,
        user: { id: user.id, nama: user.nama, username: user.username, role: user.role },
      }
    },

    async readSession(token) {
      if (!token) throw authError('INVALID_SESSION')
      try {
        const payload = tokenSigner.verify(token)
        const user = await userRepository.findActiveById(payload.userId || payload.sub)
        if (!user || !user.isActive) throw new Error('inactive')
        return { id: user.id, nama: user.nama, username: user.username, role: user.role }
      } catch {
        throw authError('INVALID_SESSION')
      }
    },

    async logout() {
      return undefined
    },
  }
}
