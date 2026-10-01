import { http } from './http.js'

export const historyApi = {
  listMine: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
    return http.request(`/api/laporan/saya${query.toString() ? `?${query}` : ''}`)
  },
  getDetail: (id) => http.request(`/api/laporan/${id}`),
}
