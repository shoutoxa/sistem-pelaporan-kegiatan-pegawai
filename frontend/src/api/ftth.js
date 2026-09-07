import { http } from './http.js'
const request = async (path, options) => (await http.request(`/api/ftth${path}`, options)).data
export const ftthApi = {
  status: () => request('/status'),
  references: () => request('/references'),
  mappings: () => request('/mappings'),
  saveMapping: (id, data) => request(`/mappings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  list: (offset = 0) => request(`/reports?limit=25&offset=${offset}`),
  detail: (id) => request(`/reports/${id}`),
  create: (body) => request('/reports', { method: 'POST', body }),
  update: (id, data) => request(`/reports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  setStatus: (id, data) => request(`/reports/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id) => request(`/reports/${id}`, { method: 'DELETE' }),
}
