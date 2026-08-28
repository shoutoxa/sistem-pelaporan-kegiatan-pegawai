import { z } from 'zod'

const id = z.string().min(1)
const name = z.string().trim().min(1).max(150)

export const masterSchemas = {
  desa: z.object({ namaDesa: name }),
  cluster: z.object({ desaId: id, clusterName: z.string().trim().min(1).max(50) }),
  pekerjaan: z.object({ namaPekerjaan: name, instruksiDokumentasi: z.string().trim().max(500).nullable().optional() }),
}

export const statusSchema = z.object({ isActive: z.boolean() })

export function normalizeSpaces(value) {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeClusterName(value) {
  const compact = normalizeSpaces(value)
  if (!compact) {
    const error = new Error('Nama Cluster tidak boleh kosong.')
    error.code = 'VALIDATION'
    throw error
  }
  return compact
}
