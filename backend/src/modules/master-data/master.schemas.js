import { z } from 'zod'

const id = z.string().min(1)
const name = z.string().trim().min(1).max(150)

export const masterSchemas = {
  desa: z.object({ namaDesa: name }),
  rw: z.object({ desaId: id, nomorRw: z.string().trim().min(1).max(20) }),
  tahapan: z.object({ namaTahapan: name, requiresNomorPerangkat: z.boolean(), instruksiDokumentasi: z.string().trim().max(500).nullable().optional() }),
}

export const statusSchema = z.object({ isActive: z.boolean() })

export function normalizeSpaces(value) {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeRw(value) {
  const compact = normalizeSpaces(value).toUpperCase().replace(/^RW\s*/, '')
  if (!/^\d{1,3}$/.test(compact)) {
    const error = new Error('Nomor RW harus berformat seperti RW 01.')
    error.code = 'VALIDATION'
    throw error
  }
  return `RW ${compact.padStart(2, '0')}`
}
