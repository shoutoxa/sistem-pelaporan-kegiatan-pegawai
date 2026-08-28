import { http } from './http.js'

export const masterApi = {
  fetchDesa: () => http.request('/api/master/desa'),
  fetchClusterByDesa: (desaId) => http.request(`/api/master/desa/${desaId}/cluster`),
  fetchPekerjaan: () => http.request('/api/master/pekerjaan'),
  fetchAdmin: (resource) => http.request(`/api/admin/${resource}`),
  create: (resource, data) => http.request(`/api/admin/${resource}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (resource, id, data) => http.request(`/api/admin/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  setActive: (resource, id, isActive) => http.request(`/api/admin/${resource}/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
}
