import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { createMasterRouter } from '../src/modules/master-data/master.routes.js'

describe('master data routes', () => {
  it('serves active data for report forms', async () => {
    const service = {
      listActiveDesa: async () => [{ id: 'd1', namaDesa: 'Dewasari' }],
      listActiveClusterByDesa: async () => [{ id: 'c1', clusterName: 'Cluster 01' }],
      listActivePekerjaan: async () => [{ id: 'p1', namaPekerjaan: 'Penggalian Lubang' }],
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

  it('returns the canonical conflict response for duplicate master data', async () => {
    const service = { create: async () => { const error = new Error('Nama Desa sudah digunakan.'); error.code = 'DUPLICATE'; error.errors = { namaDesa: 'Nama Desa sudah digunakan.' }; throw error } }
    const response = await request(createApp({ masterRouter: createMasterRouter({ service }) }))
      .post('/api/admin/desa').send({ namaDesa: 'Dewasari' })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ message: 'Nama Desa sudah digunakan.', errors: { namaDesa: 'Nama Desa sudah digunakan.' } })
  })
})
