import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { createReportRouter } from '../src/modules/laporan/report.routes.js'

describe('report route', () => {
  it('derives the actor from the authenticated session and returns the created id', async () => {
    const reportService = { createReport: async ({ actor, fields, files }) => ({ id: actor.id, createdAt: new Date('2026-08-22T01:00:00Z'), fields, files }) }
    const requirePegawai = (request, _response, next) => { request.user = { id: 'user-1', role: 'PEGAWAI' }; next() }
    const response = await request(createApp({ reportRouter: createReportRouter({ reportService, requirePegawai }) }))
      .post('/api/laporan')
      .field('tanggalKegiatan', '2026-08-22').field('rwId', 'rw-1').field('tahapanId', 'stage-1').field('keterangan', 'Kegiatan lapangan selesai')
      .attach('dokumentasi', Buffer.from('photo'), 'photo.jpg')

    expect(response.status).toBe(201)
    expect(response.body.data.id).toBe('user-1')
  })
})
