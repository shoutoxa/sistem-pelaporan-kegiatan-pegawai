const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const http = {
  async request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    })
    let body = null
    try { body = await response.json() } catch { /* 204 responses have no body */ }
    if (!response.ok) {
      const error = new Error(body?.error || 'Permintaan gagal.')
      error.status = response.status
      error.message = body?.error || 'Permintaan gagal.'
      error.errors = body?.errors
      throw error
    }
    return body
  },
}
