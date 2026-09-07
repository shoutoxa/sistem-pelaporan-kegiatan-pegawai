import { createClient } from '@supabase/supabase-js'
import { assertLocalTargets } from '../backend/local-env.js'
assertLocalTargets(process.env)
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
if (!key) throw new Error('Isi service role key Supabase LOKAL di .env.local.')
const client = createClient(process.env.SUPABASE_URL, key)
const bucket = process.env.STORAGE_BUCKET || 'dokumentasi-laporan'
const { data, error } = await client.storage.listBuckets()
if (error) throw new Error('Storage lokal tidak dapat dihubungi.')
const existing = data.find((item) => item.id === bucket)
if (existing?.public) throw new Error('Bucket lokal sudah ada tetapi public. Periksa pengaturan sebelum melanjutkan.')
if (!existing) {
  const result = await client.storage.createBucket(bucket, { public: false, fileSizeLimit: 10000000, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] })
  if (result.error) throw new Error('Gagal membuat bucket private lokal.')
}
console.log('Bucket private lokal siap.')
