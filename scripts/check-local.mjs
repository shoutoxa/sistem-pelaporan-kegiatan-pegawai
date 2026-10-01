import '../backend/load-env.js'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { assertLocalTargets } from '../backend/local-env.js'
assertLocalTargets(process.env)
if (process.env.APP_ENV !== 'local') throw new Error('Jalankan dengan APP_ENV=local.')
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const bucket = client.storage.from(process.env.STORAGE_BUCKET)
const path = `local-smoke/${randomUUID()}.png`
const data = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1kAAAAASUVORK5CYII=', 'base64')
const { error: uploadError } = await bucket.upload(path, data, { contentType: 'image/png' })
if (uploadError) throw new Error('Smoke upload gagal.')
try {
  const { data: signed, error } = await bucket.createSignedUrl(path, 60)
  if (error || !signed?.signedUrl) throw new Error('Signed URL gagal.')
  const response = await fetch(signed.signedUrl)
  if (!response.ok || !Buffer.from(await response.arrayBuffer()).equals(data)) throw new Error('Isi file signed URL tidak cocok.')
  const publicUrl = bucket.getPublicUrl(path).data.publicUrl
  if ((await fetch(publicUrl)).ok) throw new Error('Bucket seharusnya private tetapi file dapat diakses publik.')
  console.log('PASS: upload, signed URL, isi file, dan penolakan akses publik lokal.')
} finally {
  const { error } = await bucket.remove([path])
  if (error) throw new Error('File smoke lokal belum berhasil dibersihkan.')
}
