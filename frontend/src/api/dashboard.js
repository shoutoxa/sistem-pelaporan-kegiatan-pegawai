import { http } from './http.js'

export const dashboardApi = {
  get: (params = {}) => {
    const queryObj = typeof params === 'string' ? { date: params } : params
    const query = new URLSearchParams(Object.entries(queryObj).filter(([, value]) => value !== undefined && value !== ''))
    return http.request(`/api/admin/dashboard${query.toString() ? `?${query}` : ''}`)
  },
  listReports: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
    return http.request(`/api/admin/laporan${query.toString() ? `?${query}` : ''}`)
  },
  listDocumentation: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
    return http.request(`/api/admin/dokumentasi${query.toString() ? `?${query}` : ''}`)
  },
}
