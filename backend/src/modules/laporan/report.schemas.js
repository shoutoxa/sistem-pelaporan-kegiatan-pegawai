import { z } from 'zod'

export const reportSchema = z.object({
  projectId: z.string().optional(),
  clusterId: z.string().min(1, { message: 'Cluster wajib dipilih.' }),
  processId: z.string().optional(),
  pekerjaanId: z.string().optional(),
  tanggalKegiatan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal harus YYYY-MM-DD.' }),
  keterangan: z.string().trim().min(5, { message: 'Keterangan minimal 5 karakter.' }).max(2000, { message: 'Keterangan maksimal 2.000 karakter.' }),
  nomorPerangkat: z.string().trim().max(20).optional().default(''),
})

export const reportUpdateSchema = z.object({
  projectId: z.string().optional(),
  clusterId: z.string().optional(),
  processId: z.string().optional(),
  pekerjaanId: z.string().optional(),
  tanggalKegiatan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  keterangan: z.string().trim().min(5).max(2000).optional(),
  nomorPerangkat: z.string().trim().max(20).optional(),
})

export const reportApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PENDING']),
  catatanRevisi: z.string().trim().max(2000).optional().default(''),
})

export function reportError(code, message = code) {
  const error = new Error(message)
  error.code = code
  return error
}

export function jakartaDate(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export function toFttPayload(fields) {
  return {
    project_id: fields.projectId,
    cluster_id: fields.clusterId,
    process_id: fields.processId,
    tanggal_kegiatan: fields.tanggalKegiatan,
    keterangan: fields.keterangan,
    nomor_perangkat: fields.nomorPerangkat || null,
  }
}

export function toFttApprovalPayload(fields, actor) {
  return {
    status: fields.status,
    catatan_revisi: fields.catatanRevisi || null,
    verified_by: actor.id,
    verified_at: new Date().toISOString(),
  }
}