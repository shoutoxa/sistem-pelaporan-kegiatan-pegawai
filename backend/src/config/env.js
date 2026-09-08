const migrationSources = ['local', 'ftth']
function migrationSource(env, name) {
  const value = String(env[name] || 'local').trim().toLowerCase()
  return migrationSources.includes(value) ? value : 'local'
}

export function readMigrationConfig(env = process.env) {
  return {
    master: migrationSource(env, 'FTTH_MIGRATION_MASTER_SOURCE'),
    users: migrationSource(env, 'FTTH_MIGRATION_USERS_SOURCE'),
    reports: migrationSource(env, 'FTTH_MIGRATION_REPORTS_SOURCE'),
    documentation: migrationSource(env, 'FTTH_MIGRATION_DOCUMENTATION_SOURCE'),
  }
}

export const runtimeConfig = {
  ftthReportsEnabled: process.env.FTTH_REPORTS_ENABLED === 'true' && process.env.NODE_ENV !== 'production',
  migration: readMigrationConfig(),
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
