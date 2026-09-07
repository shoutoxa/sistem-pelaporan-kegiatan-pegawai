import { http } from './http.js'

export const historyApi = {
  listMine: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
    const queryString = query.toString()
    return http.request('/api/laporan/saya' + (queryString ? '?' + queryString : ''))
  },
  getDetail: (id) => http.request('/api/laporan/' + id),
}
