export const runtimeConfig = {
  port: Number(process.env.PORT || 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
};

export function missingFullConfig(env = process.env) {
  const missing = ['DATABASE_URL', 'JWT_SECRET', 'SUPABASE_URL'].filter((name) => !env[name])
  if (!env.SUPABASE_SECRET_KEY && !env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SECRET_KEY atau SUPABASE_SERVICE_ROLE_KEY')
  return missing
}

export function assertFullConfig(env = process.env) {
  const missing = missingFullConfig(env)
  if (missing.length) throw new Error(`Konfigurasi wajib belum diisi: ${missing.join(', ')}`)
}
