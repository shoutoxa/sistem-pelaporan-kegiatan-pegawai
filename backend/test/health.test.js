import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'

describe('GET /api/health', () => {
  it('reports the API and database as healthy', async () => {
    const response = await request(createApp({ healthCheck: async () => true })).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok', database: 'up' })
  })

  it('returns 503 when the database check fails', async () => {
    const response = await request(createApp({ healthCheck: async () => { throw new Error('db down') } })).get('/api/health')

    expect(response.status).toBe(503)
    expect(response.body).toEqual({ status: 'error', database: 'down' })
  })
})
