import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

export function assertLocalTargets(env) {
  for (const [key, protocols] of [['DATABASE_URL', ['postgres:', 'postgresql:']], ['SUPABASE_URL', ['http:']]]) {
    let url
    try { url = new URL(env[key]) } catch { throw new Error(`${key} lokal belum valid.`) }
    if (!protocols.includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
      throw new Error(`${key} harus menunjuk localhost pada mode lokal. Koneksi remote ditolak.`)
    }
  }
}

export function loadLocalEnv(rootDir, target = process.env) {
  const file = path.join(rootDir, '.env.local')
  if (!fs.existsSync(file)) throw new Error('Buat .env.local dari .env.local.example terlebih dahulu. Tidak memakai .env lama sebagai fallback.')
  const values = dotenv.parse(fs.readFileSync(file))
  assertLocalTargets(values)
  // All backend secrets must come from the local file, not inherited cloud configuration.
  for (const key of ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET', 'FTTH_API_KEY', 'FTTH_API_BASE_URL', 'FTTH_REPORTS_ENABLED', 'STORAGE_BUCKET', 'SEED_ADMIN_PASSWORD', 'SEED_EMPLOYEE_PASSWORD']) delete target[key]
  Object.assign(target, values)
}
