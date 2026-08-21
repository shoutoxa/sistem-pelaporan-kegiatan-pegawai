import { z } from 'zod'

export const reportSchema = z.object({
  tanggalKegiatan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rwId: z.string().min(1),
  tahapanId: z.string().min(1),
  keterangan: z.string().trim().min(5).max(2000),
  nomorPerangkat: z.string().trim().max(200).optional().default(''),
})

export function reportError(code, message = code) {
  const error = new Error(message)
  error.code = code
  return error
}

export function jakartaDate(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
