import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { createReportRouter } from '../src/modules/laporan/report.routes.js'

const validPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')

describe('report route', () => {
  it('derives the actor from the authenticated session and returns the created id', async () => {
    const reportService = { createReport: async ({ actor, fields, files }) => ({ id: actor.id, createdAt: new Date('2026-08-22T01:00:00Z'), fields, files }) }
    const requirePegawai = (request, _response, next) => { request.user = { id: 'user-1', role: 'PEGAWAI' }; next() }
    const response = await request(createApp({ reportRouter: createReportRouter({ reportService, requirePegawai }) }))
      .post('/api/laporan')
      .field('tanggalKegiatan', '2026-08-22').field('clusterId', 'c-1').field('pekerjaanId', 'p-1').field('keterangan', 'Kegiatan lapangan selesai')
      .attach('dokumentasi', validPng, { filename: 'photo.png', contentType: 'image/png' })

    expect(response.status).toBe(201)
    expect(response.body.data.id).toBe('user-1')
  })

  it('rejects a file whose bytes are not an allowed image even when the client MIME claims JPEG', async () => {
    const reportService = { createReport: async () => ({ id: 'should-not-run' }) }
    const requirePegawai = (request, _response, next) => { request.user = { id: 'user-1', role: 'PEGAWAI' }; next() }
    const response = await request(createApp({ reportRouter: createReportRouter({ reportService, requirePegawai }) }))
      .post('/api/laporan')
      .field('tanggalKegiatan', '2026-08-22').field('clusterId', 'c-1').field('pekerjaanId', 'p-1').field('keterangan', 'Kegiatan lapangan selesai')
      .attach('dokumentasi', Buffer.from('not-an-image'), { filename: 'photo.jpg', contentType: 'image/jpeg' })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ message: 'Format foto harus JPG, PNG, atau WEBP.', errors: { dokumentasi: 'Format foto harus JPG, PNG, atau WEBP.' } })
  })

  it('returns the canonical field-error response shape', async () => {
    const reportService = { createReport: async () => { const error = new Error('Data laporan tidak valid'); error.code = 'VALIDATION'; error.errors = { clusterId: 'Cluster tidak tersedia' }; throw error } }
    const requirePegawai = (request, _response, next) => { request.user = { id: 'user-1', role: 'PEGAWAI' }; next() }
    const response = await request(createApp({ reportRouter: createReportRouter({ reportService, requirePegawai }) }))
      .post('/api/laporan')
      .field('tanggalKegiatan', '2026-08-22').field('clusterId', 'c-1').field('pekerjaanId', 'p-1').field('keterangan', 'Kegiatan lapangan selesai')
      .attach('dokumentasi', validPng, { filename: 'photo.png', contentType: 'image/png' })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ message: 'Data laporan tidak valid', errors: { clusterId: 'Cluster tidak tersedia' } })
  })
})
