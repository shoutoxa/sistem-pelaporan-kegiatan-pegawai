export function requireAuth({ authService }) {
  return async (request, response, next) => {
    try {
      request.user = await authService.readSession(request.cookies.session)
      return next()
    } catch {
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
