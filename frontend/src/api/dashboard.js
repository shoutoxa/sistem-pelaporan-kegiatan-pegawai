import { http } from './http.js'

export const dashboardApi = {
  get: (date) => http.request(`/api/admin/dashboard${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  listReports: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
    return http.request(`/api/admin/laporan${query.toString() ? `?${query}` : ''}`)
  },
}
