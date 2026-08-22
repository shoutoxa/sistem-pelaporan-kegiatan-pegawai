import { http } from './http.js'

export function createReport(formState) {
  const body = new FormData()
  body.append('tanggalKegiatan', formState.tanggalKegiatan)
  body.append('rwId', formState.rwId)
  body.append('tahapanId', formState.tahapanId)
  body.append('keterangan', formState.keterangan)
  body.append('nomorPerangkat', formState.nomorPerangkat || '')
  formState.files.forEach((file) => body.append('dokumentasi', file))
  return http.request('/api/laporan', { method: 'POST', body })
}

export function updateReport(id, fields) {
  return http.request(`/api/laporan/${id}`, { method: 'PUT', body: JSON.stringify(fields) })
}
