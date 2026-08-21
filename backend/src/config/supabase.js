import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { createStorage } from '../modules/laporan/report.storage.js'

export function createSupabaseStorage() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase Storage belum dikonfigurasi.')
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  return createStorage({ client, bucket: process.env.STORAGE_BUCKET || 'dokumentasi-laporan' })
}
