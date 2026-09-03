const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const http = {
  async request(path, options = {}) {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
    const maxRetries = options.retries ?? 3
    let attempt = 0

    while (true) {
      try {
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
      } catch (error) {
        if (error.status === undefined && attempt < maxRetries) {
          attempt++
          await delay(attempt * 300)
          continue
        }
        throw error
      }
    }
  },
}
