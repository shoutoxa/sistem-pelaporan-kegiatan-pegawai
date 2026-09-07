import { describe, expect, it, vi } from 'vitest'
import { createHistoryService } from '../src/modules/history/history.service.js'

describe('history service', () => {
  it('always scopes an employee list to the actor id', async () => {
    const prisma = { laporan: { findMany: vi.fn().mockResolvedValue([{ id: 'r1', userId: 'u1', createdAt: new Date('2026-08-22T01:00:00Z') }]), count: vi.fn().mockResolvedValue(1), findFirst: vi.fn() } }
    const service = createHistoryService({ prisma, storage: { createSignedUrl: vi.fn() }, clock: () => new Date('2026-08-22T04:00:00Z') })

    const result = await service.listOwnReports({ actor: { id: 'u1', role: 'PEGAWAI' }, page: 1, limit: 20 })
    expect(prisma.laporan.findMany.mock.calls[0][0].where.userId).toBe('u1')
    expect(result.items[0]).toMatchObject({ canEdit: true, editableUntil: '2026-08-23T01:00:00.000Z' })
  })

  it('rejects another employee and permits a Superadmin on detail', async () => {
    const prisma = { laporan: { findFirst: vi.fn().mockResolvedValue({ id: 'r1', userId: 'owner', dokumentasi: [] }) } }
    const service = createHistoryService({ prisma, storage: { createSignedUrl: vi.fn() } })

    await expect(service.getReportDetail({ actor: { id: 'other', role: 'PEGAWAI' }, reportId: 'r1' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(service.getReportDetail({ actor: { id: 'admin', role: 'SUPERADMIN' }, reportId: 'r1' })).resolves.toMatchObject({ id: 'r1' })
  })

  it('keeps accepted reports locked in the employee history', async () => {
    const prisma = { laporan: { findMany: vi.fn().mockResolvedValue([{ id: 'r1', userId: 'u1', diterima: true, createdAt: new Date('2026-08-22T01:00:00Z') }]), count: vi.fn().mockResolvedValue(1), findFirst: vi.fn() } }
    const service = createHistoryService({ prisma, storage: {}, clock: () => new Date('2026-08-22T04:00:00Z') })

    const result = await service.listOwnReports({ actor: { id: 'u1', role: 'PEGAWAI' } })
    expect(result.items[0].canEdit).toBe(false)
  })

  it('searches admin reports only by employee, location, and pekerjaan', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const prisma = { laporan: { findMany, count: vi.fn().mockResolvedValue(0) } }
    const service = createHistoryService({ prisma, storage: {} })

    await service.listAdminReports({ search: 'RW 01' })
    const where = findMany.mock.calls[0][0].where
    expect(where.OR).toEqual(expect.arrayContaining([
      expect.objectContaining({ user: expect.any(Object) }),
      expect.objectContaining({ cluster: expect.any(Object) }),
      expect.objectContaining({ pekerjaan: expect.any(Object) }),
    ]))
    expect(JSON.stringify(where)).not.toContain('keterangan')
    expect(JSON.stringify(where)).not.toContain('nomorPerangkat')
  })

  it('filters documentation by desa, cluster, and pekerjaan', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const prisma = { laporan: { findMany } }
    const service = createHistoryService({ prisma, storage: {} })

    await service.listDocumentation({ desaId: 'd1', pekerjaanId: 'p1' })
    expect(findMany.mock.calls[0][0].where).toMatchObject({
      pekerjaanId: 'p1',
      cluster: { desaId: 'd1' },
    })

    await service.listDocumentation({ desaId: 'd1', clusterId: 'c1', pekerjaanId: 'p1' })
    expect(findMany.mock.calls[1][0].where).toMatchObject({
      clusterId: 'c1',
      pekerjaanId: 'p1',
    })
    expect(findMany.mock.calls[1][0].where.cluster).toBeUndefined()
  })

  it('strictly scopes documentation to the specific report in FTTH mode', async () => {
    const ftthApi = {
      getReportById: vi.fn().mockResolvedValue({
        id: 'report-100',
        user_id: 'u1',
        dokumentasi: [
          { id: 'doc-1', laporan_id: 'report-100', file_url: '/uploads/doc1.png' },
          { id: 'doc-2', laporan_id: 'report-999', file_url: '/uploads/doc2.png' },
        ],
      }),
      getDocumentation: vi.fn().mockResolvedValue([
        { id: 'doc-3', laporan_id: 'report-999', file_url: '/uploads/doc3.png' },
      ]),
    }
    const service = createHistoryService({ ftthApi })
    const result = await service.getReportDetail({ actor: { id: 'u1', role: 'PEGAWAI' }, reportId: 'report-100' })

    expect(result.dokumentasi).toHaveLength(1)
    expect(result.dokumentasi[0].id).toBe('doc-1')
    expect(result.dokumentasi[0].signedUrl).toBe('https://ftth.digitak.id/uploads/doc1.png')
  })

  it('filters fallback documentation by reportId in FTTH mode', async () => {
    const ftthApi = {
      getReportById: vi.fn().mockResolvedValue({
        id: 'report-200',
        user_id: 'u1',
        dokumentasi: [],
      }),
      getDocumentation: vi.fn().mockResolvedValue([
        { id: 'doc-correct', laporan_id: 'report-200', file_url: '/uploads/correct.png' },
        { id: 'doc-wrong', laporan_id: 'report-other', file_url: '/uploads/wrong.png' },
      ]),
    }
    const service = createHistoryService({ ftthApi })
    const result = await service.getReportDetail({ actor: { id: 'u1', role: 'PEGAWAI' }, reportId: 'report-200' })

    expect(result.dokumentasi).toHaveLength(1)
    expect(result.dokumentasi[0].id).toBe('doc-correct')
  })
})

