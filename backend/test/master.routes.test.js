import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { createMasterRouter } from '../src/modules/master-data/master.routes.js'

describe('master data routes', () => {
  it('serves active data for report forms', async () => {
    const service = {
      listActiveDesa: async () => [{ id: 'd1', namaDesa: 'Dewasari' }],
      listActiveClusterByDesa: async () => [{ id: 'c1', clusterName: 'RW 01' }],
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

  it('keeps FTTH project reads behind Superadmin middleware', async () => {
    const service = { listFtthResource: async () => [{ id: 'project-1' }] }
    const deny = (_request, response) => response.status(403).json({ error: 'Anda tidak memiliki akses.' })
    const response = await request(createApp({ masterRouter: createMasterRouter({ service, requireSuperadmin: deny }) }))
      .get('/api/admin/integration/ftth/projects')

    expect(response.status).toBe(403)
  })

  it('exposes FTTH sync only through the injected Superadmin middleware', async () => {
    const service = { syncFtth: async () => ({ categories: { total: 3 }, processes: { total: 14 } }) }
    const deny = (_request, response) => response.status(403).json({ error: 'Anda tidak memiliki akses.' })
    const response = await request(createApp({ masterRouter: createMasterRouter({ service, requireSuperadmin: deny }) }))
      .post('/api/admin/integration/ftth/sync')

    expect(response.status).toBe(403)
  })

  it('reports migration sources without changing the default local mode', async () => {
    const service = { integrationStatus: async () => ({ configured: true, categories: 2, processes: 4, lastSyncedAt: null }) }
    const response = await request(createApp({ masterRouter: createMasterRouter({ service, migration: { master: 'ftth', users: 'local' } }) }))
      .get('/api/admin/integration/ftth/status')

    expect(response.status).toBe(200)
    expect(response.body.migration).toEqual({ master: 'ftth', users: 'local' })
  })

  it('returns the canonical conflict response for duplicate master data', async () => {
    const service = { create: async () => { const error = new Error('Nama Desa sudah digunakan.'); error.code = 'DUPLICATE'; error.errors = { namaDesa: 'Nama Desa sudah digunakan.' }; throw error } }
    const response = await request(createApp({ masterRouter: createMasterRouter({ service }) }))
      .post('/api/admin/desa').send({ namaDesa: 'Dewasari' })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ message: 'Nama Desa sudah digunakan.', errors: { namaDesa: 'Nama Desa sudah digunakan.' } })
  })
})
