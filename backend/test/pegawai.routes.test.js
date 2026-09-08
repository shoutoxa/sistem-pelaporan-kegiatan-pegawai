import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { createPegawaiRouter } from '../src/modules/pegawai/pegawai.routes.js'

describe('pegawai routes', () => {
  it('rejects direct employee creation, update, and status modifications with 403 as user management is delegated to FTTH Core', async () => {
    const app = createApp({ dashboardRouter: createPegawaiRouter() })

    const created = await request(app).post('/api/admin/pegawai').send({ nama: 'Ayu', username: 'ayu', password: 'password-ku' })
    const updated = await request(app).put('/api/admin/pegawai/u1').send({ nama: 'Ayu Baru' })
    const status = await request(app).patch('/api/admin/pegawai/u1/status').send({ isActive: false })

    expect(created.status).toBe(403)
    expect(created.body.message).toBe('Penambahan pegawai harus dikelola melalui FTTH Core.')
    expect(updated.status).toBe(403)
    expect(updated.body.message).toBe('Perubahan data pegawai harus dikelola melalui FTTH Core.')
    expect(status.status).toBe(403)
    expect(status.body.message).toBe('Perubahan status pegawai harus dikelola melalui FTTH Core.')
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

  it('rejects employee photo upload if magic bytes do not match allowed image types', async () => {
    const app = createApp({ dashboardRouter: createPegawaiRouter() })
    const response = await request(app)
      .post('/api/admin/pegawai/u1/foto')
      .attach('fotoProfil', Buffer.from('NOT_AN_IMAGE_CONTENT'), { filename: 'avatar.jpg', contentType: 'image/jpeg' })

    expect(response.status).toBe(400)
    expect(response.body.message).toBe('Format foto harus JPG, PNG, atau WEBP.')
  })
})
