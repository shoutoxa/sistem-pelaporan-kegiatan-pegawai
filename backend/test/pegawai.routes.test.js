import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { createPegawaiRouter } from '../src/modules/pegawai/pegawai.routes.js'

describe('pegawai routes', () => {
  it('creates and updates employee accounts through canonical admin endpoints', async () => {
    const service = { create: vi.fn().mockResolvedValue({ id: 'u1', role: 'PEGAWAI' }), update: vi.fn().mockResolvedValue({ id: 'u1', nama: 'Ayu Baru' }) }
    const app = createApp({ dashboardRouter: createPegawaiRouter({ service }) })

    const created = await request(app).post('/api/admin/pegawai').send({ nama: 'Ayu', username: 'ayu', password: 'password-ku' })
    const updated = await request(app).put('/api/admin/pegawai/u1').send({ nama: 'Ayu Baru' })

    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({ id: 'u1', role: 'PEGAWAI' })
    expect(updated.status).toBe(200)
    expect(service.update).toHaveBeenCalledWith('u1', { nama: 'Ayu Baru' })
  })

  it('returns canonical validation errors for an invalid status', async () => {
    const service = { setActive: vi.fn() }
    const response = await request(createApp({ dashboardRouter: createPegawaiRouter({ service }) }))
      .patch('/api/admin/pegawai/u1/status').send({ isActive: 'yes' })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ message: 'Status aktif harus boolean.', errors: { isActive: 'Status aktif harus boolean.' } })
    expect(service.setActive).not.toHaveBeenCalled()
  })

  it('fetches clusters and reporting status for an employee', async () => {
    const { ftthApi } = await import('../src/services/ftthApi.js')
    const clustersSpy = vi.spyOn(ftthApi, 'getUserClusters').mockResolvedValue([{ id: 'c1', name: 'RW 09' }])
    const statusSpy = vi.spyOn(ftthApi, 'getUserLaporanStatus').mockResolvedValue({
      user_id: 'u1',
      wajib_lapor: true,
      tanggal: '2026-09-08',
      clusters: [{ cluster_id: 'c1', sudah_lapor: false }],
    })

    const app = createApp({ dashboardRouter: createPegawaiRouter() })
    const clustersRes = await request(app).get('/api/admin/pegawai/u1/clusters')
    const statusRes = await request(app).get('/api/admin/pegawai/u1/laporan-status')

    expect(clustersRes.status).toBe(200)
    expect(clustersRes.body.data).toEqual([{ id: 'c1', name: 'RW 09' }])
    expect(statusRes.status).toBe(200)
    expect(statusRes.body.data.wajib_lapor).toBe(true)

    clustersSpy.mockRestore()
    statusSpy.mockRestore()
  })
})
