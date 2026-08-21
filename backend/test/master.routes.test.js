import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { createMasterRouter } from '../src/modules/master-data/master.routes.js'

describe('master data routes', () => {
  it('serves active data for report forms', async () => {
    const service = {
      listActiveDesa: async () => [{ id: 'd1', namaDesa: 'Dewasari' }],
      listActiveRwByDesa: async () => [{ id: 'r1', nomorRw: 'RW 01' }],
      listActiveTahapan: async () => [{ id: 't1', namaTahapan: 'Penggalian Lubang' }],
    }
    const response = await request(createApp({ masterRouter: createMasterRouter({ service }) })).get('/api/master/desa')

    expect(response.status).toBe(200)
    expect(response.body).toEqual([{ id: 'd1', namaDesa: 'Dewasari' }])
  })

  it('requires the injected Superadmin middleware for admin changes', async () => {
    const service = { create: async () => ({ id: 'd1', namaDesa: 'Dewasari' }) }
    const deny = (_request, response) => response.status(403).json({ error: 'Anda tidak memiliki akses.' })
    const response = await request(createApp({ masterRouter: createMasterRouter({ service, requireSuperadmin: deny }) }))
      .post('/api/admin/desa').send({ namaDesa: 'Dewasari' })

    expect(response.status).toBe(403)
  })
})
