import { http } from './http.js'

export const masterApi = {
  fetchDesa: () => http.request('/api/master/desa'),
  fetchRwByDesa: (desaId) => http.request(`/api/master/desa/${desaId}/rw`),
  fetchTahapan: () => http.request('/api/master/tahapan'),
}
