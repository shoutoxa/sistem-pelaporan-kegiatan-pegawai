import express from 'express'
import request from 'supertest'
import { describe, it, expect, vi } from 'vitest'
import { createFtthReportRouter } from '../src/modules/integration/ftth-report.routes.js'
import { requireAuth, requireRole } from '../src/modules/auth/auth.middleware.js'
function app(role, enabled = true) {
  const service = { list: vi.fn().mockResolvedValue([]), setStatus: vi.fn(), profilePhoto: vi.fn().mockImplementation((_user, _id, options) => Promise.resolve({ buffer: Buffer.from('photo'), mimeType: 'image/jpeg', filename: 'foto.jpg', forceDownload: options?.forceDownload })), uploadProfilePhoto: vi.fn().mockResolvedValue({ foto: '/uploads/foto.jpg' }), download: vi.fn().mockImplementation((_user, _reportId, _attachmentId, options) => Promise.resolve({ buffer: Buffer.from('file'), mimeType: 'image/png', filename: 'foto.png', forceDownload: options?.forceDownload })) }
  const authService = { readSession: vi.fn().mockImplementation(async () => {
    if (!role) throw new Error('no session')
    return { id: 'local-user', role }
  }) }
  const instance = express().use(express.json()).use((r, _s, next) => { r.cookies = {}; next() })
  instance.use('/api', createFtthReportRouter({ service, enabled, requireAuth: requireAuth({ authService }), requireSuperadmin: requireRole('SUPERADMIN') }))
  return { instance, service }
}
describe('FTTH route guards', () => {
  it('requires local authentication', async () => {
    expect((await request(app(null).instance).get('/api/ftth/reports')).status).toBe(401)
  })
  it('fails closed when disabled', async () => {
    const { instance } = app('SUPERADMIN', false)
    expect((await request(instance).get('/api/ftth/status')).body.data.enabled).toBe(false)
    expect((await request(instance).post('/api/ftth/reports')).status).toBe(503)
  })
  it('forbids employee status, mapping, editing and deletion endpoints', async () => {
    const { instance, service } = app('PEGAWAI')
    for (const [method, path] of [['patch', '/reports/id/status'], ['put', '/reports/id'], ['delete', '/reports/id'], ['put', '/mappings/id'], ['get', '/mappings']]) {
      expect((await request(instance)[method](`/api/ftth${path}`)).status).toBe(403)
    }
    expect(service.setStatus).not.toHaveBeenCalled()
  })
  it('streams attachment downloads without JSON wrapping', async () => {
    const { instance, service } = app('SUPERADMIN')
    const response = await request(instance).get('/api/ftth/reports/report/attachments/attachment/download')
    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toMatch(/^image\/png/)
    expect(response.headers['content-disposition']).toContain('foto.png')
    expect(response.body.toString()).toBe('file')
    expect(service.download).toHaveBeenCalledWith({ id: 'local-user', role: 'SUPERADMIN' }, 'report', 'attachment', { forceDownload: false })
  })
  it('marks a requested download as an attachment', async () => {
    const { instance } = app('SUPERADMIN')
    const response = await request(instance).get('/api/ftth/reports/report/attachments/attachment/download?mode=download')
    expect(response.status).toBe(200)
    expect(response.headers['content-disposition']).toMatch(/^attachment;/)
  })
  it('streams FTTH profile photos and keeps upload admin-only', async () => {
    const { instance, service } = app('SUPERADMIN')
    const response = await request(instance).get('/api/ftth/users/user/foto?mode=download')
    expect(response.status).toBe(200)
    expect(response.headers['content-disposition']).toMatch(/^attachment;/)
    await request(instance).post('/api/ftth/users/user/foto').attach('file', Buffer.from('x'), 'foto.jpg')
    expect(service.uploadProfilePhoto).toHaveBeenCalled()
    const employee = app('PEGAWAI')
    expect((await request(employee.instance).post('/api/ftth/users/user/foto').attach('file', Buffer.from('x'), 'foto.jpg')).status).toBe(403)
  })
})
