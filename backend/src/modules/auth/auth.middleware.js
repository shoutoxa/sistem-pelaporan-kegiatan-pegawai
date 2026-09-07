export function requireAuth({ authService }) {
  return async (request, response, next) => {
    try {
      const token = request.cookies?.session
      if (authService.readSession) {
        request.user = await authService.readSession(token)
        return next()
      }
      if (!token) {
        return response.status(401).json({ message: 'Sesi tidak valid atau sudah berakhir.' })
      }
      const decoded = await authService.verifyToken(token)
      if (!decoded) {
        response.clearCookie?.('session', { httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 0 })
        return response.status(401).json({ message: 'Sesi tidak valid atau sudah berakhir.' })
      }
      request.user = {
        id: decoded.userId,
        username: decoded.username || '',
        nama: decoded.nama || decoded.username || (decoded.role === 'SUPERADMIN' ? 'Superadmin' : 'Pegawai'),
        role: decoded.role,
      }
      return next()
    } catch {
      response.clearCookie?.('session', { httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 0 })
      return response.status(401).json({ message: 'Sesi tidak valid atau sudah berakhir.' })
    }
  }
}

export function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return response.status(403).json({ message: 'Anda tidak memiliki akses.' })
    }
    return next()
  }
}
