import { http } from './http.js'

export function createReport(formState) {
  const body = new FormData()
  body.append('tanggalKegiatan', formState.tanggalKegiatan)
  body.append('clusterId', formState.clusterId)
  body.append('pekerjaanId', formState.pekerjaanId)
  body.append('keterangan', formState.keterangan)
  body.append('nomorPerangkat', formState.nomorPerangkat || '')
  formState.files.forEach((file) => body.append('dokumentasi', file))
  return http.request('/api/laporan', { method: 'POST', body })
}

export function updateReport(id, fields) {
  return http.request(`/api/laporan/${id}`, { method: 'PUT', body: JSON.stringify(fields) })
}

export function updateAdminReport(id, fields) {
  return http.request(`/api/admin/laporan/${id}`, { method: 'PUT', body: JSON.stringify(fields) })
}

export function updateDiterimaStatus(id, diterima) {
  return http.request(`/api/admin/laporan/${id}/diterima`, { method: 'PATCH', body: JSON.stringify({ diterima }) })
}
