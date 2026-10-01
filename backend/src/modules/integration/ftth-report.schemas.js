import { z } from 'zod'

export const idSchema = z.string().uuid()
export const mappingSchema = z.object({
  externalUserId: idSchema,
  allowedClusterIds: z.array(idSchema).max(100).default([]),
}).strict()
export const fieldsSchema = z.object({
  project_id: idSchema,
  cluster_id: idSchema,
  process_id: idSchema,
  tanggal_kegiatan: z.iso.date(),
  nomor_perangkat: z.string().trim().max(100).default(''),
  status: z.enum(['ON_PROGRESS', 'SELESAI', 'KENDALA']).default('ON_PROGRESS'),
  kendala_lapangan: z.string().trim().max(2000).optional().nullable(),
  keterangan: z.string().trim().max(2000).optional().nullable(),
}).strict().refine((data) => {
  if (data.status === 'KENDALA') {
    const text = (data.kendala_lapangan || data.keterangan || '').trim()
    return text.length >= 5
  }
  return true
}, {
  message: 'Kendala lapangan wajib diisi minimal 5 karakter jika status Kendala.',
  path: ['kendala_lapangan'],
})
export const statusSchema = z.object({
  status: z.enum(['ON_PROGRESS', 'SELESAI', 'KENDALA', 'PENDING', 'APPROVED', 'REJECTED']),
  catatan_revisi: z.string().trim().max(2000).default(''),
}).strict().refine((value) => value.status !== 'REJECTED' || value.catatan_revisi.length > 0)
export const pageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
}).strict()

export function fail(code, message) { return Object.assign(new Error(message), { code }) }
export function parse(schema, input) {
  const result = schema.safeParse(input)
  if (!result.success) throw fail('VALIDATION', 'Data tidak valid atau mengandung field yang tidak diizinkan.')
  return result.data
}
export function row(value) {
  const item = value?.data ?? value
  if (!item || !idSchema.safeParse(item.id).success) throw fail('INTEGRATION_INVALID_RESPONSE', 'Struktur respons FTTH tidak sesuai kontrak.')
  return item
}
export function rows(value) {
  const items = value?.data ?? value
  if (!Array.isArray(items)) throw fail('INTEGRATION_INVALID_RESPONSE', 'Daftar data FTTH tidak sesuai kontrak.')
  return items.map(row)
}
