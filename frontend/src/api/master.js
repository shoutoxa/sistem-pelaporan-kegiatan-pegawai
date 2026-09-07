import { http } from './http.js'

export const masterApi = {
  fetchDesa: () => http.request('/api/master/desa'),
  fetchClusterByDesa: (desaId) => http.request(`/api/master/desa/${desaId}/cluster`),
  fetchKategori: () => http.request('/api/master/kategori'),
  fetchPekerjaan: (kategoriId) => http.request(`/api/master/pekerjaan${kategoriId ? `?kategoriId=${encodeURIComponent(kategoriId)}` : ''}`),
  fetchAdmin: (resource) => http.request(`/api/admin/${resource}`),
  getFtthIntegrationStatus: () => http.request('/api/admin/integration/ftth/status'),
  syncFtth: () => http.request('/api/admin/integration/ftth/sync', { method: 'POST' }),
  create: (resource, data) => http.request(`/api/admin/${resource}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (resource, id, data) => http.request(`/api/admin/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  setActive: (resource, id, isActive) => http.request(`/api/admin/${resource}/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
}
