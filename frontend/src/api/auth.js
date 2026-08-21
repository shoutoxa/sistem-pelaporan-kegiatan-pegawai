import { http } from './http.js'

export const authApi = {
  me: () => http.request('/api/auth/me'),
  login: (credentials) => http.request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  logout: () => http.request('/api/auth/logout', { method: 'POST' }),
}
