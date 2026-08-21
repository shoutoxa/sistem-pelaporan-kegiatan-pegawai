import { describe, expect, it, vi } from 'vitest'
import { createHistoryService } from '../src/modules/history/history.service.js'

describe('history service', () => {
  it('always scopes an employee list to the actor id', async () => {
    const prisma = { laporan: { findMany: vi.fn().mockResolvedValue([{ id: 'r1', userId: 'u1' }]), count: vi.fn().mockResolvedValue(1), findFirst: vi.fn() } }
    const service = createHistoryService({ prisma, storage: { createSignedUrl: vi.fn() } })

    await service.listOwnReports({ actor: { id: 'u1', role: 'PEGAWAI' }, page: 1, limit: 20 })
    expect(prisma.laporan.findMany.mock.calls[0][0].where.userId).toBe('u1')
  })

  it('rejects another employee and permits a Superadmin on detail', async () => {
    const prisma = { laporan: { findFirst: vi.fn().mockResolvedValue({ id: 'r1', userId: 'owner', dokumentasi: [] }) } }
    const service = createHistoryService({ prisma, storage: { createSignedUrl: vi.fn() } })

    await expect(service.getReportDetail({ actor: { id: 'other', role: 'PEGAWAI' }, reportId: 'r1' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(service.getReportDetail({ actor: { id: 'admin', role: 'SUPERADMIN' }, reportId: 'r1' })).resolves.toMatchObject({ id: 'r1' })
  })
})
