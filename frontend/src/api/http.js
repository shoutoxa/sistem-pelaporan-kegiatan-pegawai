const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const http = {
  async request(path, options = {}) {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: isFormData ? options.headers : { 'Content-Type': 'application/json', ...(options.headers || {}) },
    })
    let body = null
    try { body = await response.json() } catch { /* 204 responses have no body */ }
    if (!response.ok) {
      const message = body?.message || body?.error || 'Permintaan gagal.'
      const error = new Error(message)
      error.status = response.status
      error.errors = body?.errors
      throw error
    }
    return body
  },
}
