export const runtimeConfig = {
  port: Number(process.env.PORT || 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
};

export function missingFullConfig(env = process.env) {
  return ['DATABASE_URL', 'JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((name) => !env[name])
}

export function assertFullConfig(env = process.env) {
  const missing = missingFullConfig(env)
  if (missing.length) throw new Error(`Konfigurasi wajib belum diisi: ${missing.join(', ')}`)
}
