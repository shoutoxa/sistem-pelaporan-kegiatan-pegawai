export function requireAuth({ authService }) {
  return async (request, response, next) => {
    try {
      request.user = await authService.readSession(request.cookies?.session)
      // Company IDs must not be interpreted as historical local user IDs.
      if (request.user.identitySource === 'ftth' && (
        /^\/laporan(?:\/|$)/.test(request.path) || /^\/admin\/laporan\//.test(request.path) ||
        /^\/master\//.test(request.path) || /^\/admin\/(desa|cluster|pekerjaan|kategori)(?:\/|$)/.test(request.path) ||
        request.path === '/admin/integration/ftth/sync' || request.path === '/pegawai/foto'
      )) return response.status(409).json({ message: 'Endpoint ini memakai data lokal lama. Gunakan halaman FTTH; akses arsip lokal memerlukan mode login lokal.' })
      return next()
    } catch (error) {
      if (error.code === 'AUTH_UNAVAILABLE') return response.status(502).json({ message: 'Sesi FTTH belum dapat diverifikasi. Coba kembali nanti.' })
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
