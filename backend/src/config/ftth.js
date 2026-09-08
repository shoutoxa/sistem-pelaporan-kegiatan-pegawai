export const FTTH_CONFIG = {
  baseUrl: process.env.FTTH_API_URL || 'https://ftth.digitak.id/ftth_api',
  get apiKey() {
    return process.env.FTTH_API_KEY || ''
  },
  get headers() {
    const headers = {
      'Content-Type': 'application/json',
    }
    if (process.env.FTTH_API_KEY) {
      headers['x-api-key'] = process.env.FTTH_API_KEY
    }
    return headers
  },
}