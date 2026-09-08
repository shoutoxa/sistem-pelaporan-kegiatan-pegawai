import { describe, expect, it, vi } from 'vitest'
import { createHistoryService } from '../src/modules/history/history.service.js'

describe('history service with FTTH API', () => {
  it('always scopes an employee list to the actor id in FTTH mode', async () => {
    const ftthApi = {
      getReports: vi.fn().mockResolvedValue([
        { id: 'r1', user_id: 'u1', created_at: '2026-08-22T01:00:00Z', status: 'PENDING' },
      ]),
    }
    const service = createHistoryService({ ftthApi, clock: () => new Date('2026-08-22T04:00:00Z') })

    const result = await service.listOwnReports({ actor: { id: 'u1', role: 'PEGAWAI' }, page: 1, limit: 20 })
    expect(ftthApi.getReports).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1' }))
    expect(result.items[0]).toMatchObject({ canEdit: true, editableUntil: '2026-08-23T01:00:00.000Z' })
  })

  it('rejects another employee and permits a Superadmin on detail in FTTH mode', async () => {
    const ftthApi = {
      getReportById: vi.fn().mockResolvedValue({ id: 'r1', user_id: 'owner', dokumentasi: [] }),
    }
    const service = createHistoryService({ ftthApi })

    await expect(service.getReportDetail({ actor: { id: 'other', role: 'PEGAWAI' }, reportId: 'r1' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(service.getReportDetail({ actor: { id: 'admin', role: 'SUPERADMIN' }, reportId: 'r1' })).resolves.toMatchObject({ id: 'r1' })
  })

  it('keeps approved reports locked in the employee history', async () => {
    const ftthApi = {
      getReports: vi.fn().mockResolvedValue([
        { id: 'r1', user_id: 'u1', status: 'APPROVED', created_at: '2026-08-22T01:00:00Z' },
      ]),
    }
    const service = createHistoryService({ ftthApi, clock: () => new Date('2026-08-22T04:00:00Z') })

    const result = await service.listOwnReports({ actor: { id: 'u1', role: 'PEGAWAI' } })
    expect(result.items[0].canEdit).toBe(false)
  })

  it('queries admin reports via FTTH API filters', async () => {
    const ftthApi = {
      getReports: vi.fn().mockResolvedValue([
        { id: 'r1', user_id: 'u1', cluster_name: 'RW 01' },
      ]),
    }
    const service = createHistoryService({ ftthApi })

    const result = await service.listAdminReports({ search: 'RW 01', page: 1, limit: 10 })
    expect(ftthApi.getReports).toHaveBeenCalledWith(expect.objectContaining({ search: 'RW 01', limit: 10 }))
    expect(result.items).toHaveLength(1)
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
