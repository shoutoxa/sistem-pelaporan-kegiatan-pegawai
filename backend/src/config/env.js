export const runtimeConfig = {
  ftthReportsEnabled: process.env.FTTH_REPORTS_ENABLED === 'true' || true,
  port: Number(process.env.PORT || 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
}

export function missingFullConfig(env = process.env) {
  const missing = ['JWT_SECRET', 'FTTH_API_KEY'].filter((name) => !env[name])
  return missing
}

export function assertFullConfig(env = process.env) {
  const missing = missingFullConfig(env)
  if (missing.length) throw new Error(`Konfigurasi wajib belum diisi: ${missing.join(', ')}`)
}
