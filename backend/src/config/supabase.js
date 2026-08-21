import '../../load-env.js'
import { createClient } from '@supabase/supabase-js'
import { createStorage } from '../modules/laporan/report.storage.js'

export function createSupabaseStorage() {
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!process.env.SUPABASE_URL || !secretKey) throw new Error('Supabase Storage belum dikonfigurasi.')
  const client = createClient(process.env.SUPABASE_URL, secretKey)
  return createStorage({ client, bucket: process.env.STORAGE_BUCKET || 'dokumentasi-laporan' })
}
