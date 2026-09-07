import { http } from './http.js'

export const dashboardApi = {
  get: (params = {}) => {
    const queryObj = typeof params === 'string' ? { date: params } : params
    const query = new URLSearchParams(Object.entries(queryObj).filter(([, value]) => value !== undefined && value !== ''))
    const queryString = query.toString()
    return http.request('/api/admin/dashboard' + (queryString ? '?' + queryString : ''))
  },
  listReports: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
    const queryString = query.toString()
    return http.request('/api/admin/laporan' + (queryString ? '?' + queryString : ''))
  },
  listDocumentation: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
    const queryString = query.toString()
    return http.request('/api/admin/dokumentasi' + (queryString ? '?' + queryString : ''))
  },
  listReportsByProject: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
    const queryString = query.toString()
    return http.request('/api/admin/laporan' + (queryString ? '?' + queryString : ''))
  },
}
