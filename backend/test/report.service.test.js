import { describe, expect, it, vi } from 'vitest'
import { createReportService } from '../src/modules/laporan/report.service.js'

function makePrisma({ transactionFails = false } = {}) {
  const tx = {
    laporan: { create: vi.fn().mockResolvedValue({ id: 'report-1', createdAt: new Date('2026-08-22T01:00:00Z') }) },
    dokumentasi: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
  }
  return {
    rw: { findFirst: vi.fn().mockResolvedValue({ id: 'rw-1', isActive: true }) },
    tahapan: { findFirst: vi.fn().mockResolvedValue({ id: 'stage-1', isActive: true, requiresNomorPerangkat: false }) },
    laporan: { findFirst: vi.fn().mockResolvedValue({ id: 'report-1', userId: 'user-1', dokumentasi: [{ storagePath: 'reports/report-1/1.jpg' }] }) },
    $transaction: vi.fn(async (callback) => { if (transactionFails) throw new Error('db failed'); return callback(tx) }),
  }
}

const files = [{ buffer: Buffer.from('photo'), originalname: 'photo.jpg', mimetype: 'image/jpeg', size: 5 }]

describe('report service', () => {
  it('uploads files and persists one report with documentation', async () => {
    const storage = { upload: vi.fn().mockResolvedValue(undefined), remove: vi.fn(), createSignedUrl: vi.fn().mockResolvedValue('signed') }
    const prisma = makePrisma()
    const service = createReportService({ prisma, storage, clock: () => new Date('2026-08-22T04:00:00Z') })

    await expect(service.createReport({ actor: { id: 'user-1', role: 'PEGAWAI' }, fields: { tanggalKegiatan: '2026-08-22', rwId: 'rw-1', tahapanId: 'stage-1', keterangan: 'Kegiatan lapangan selesai' }, files })).resolves.toMatchObject({ id: 'report-1' })
    expect(storage.upload).toHaveBeenCalledTimes(1)
    expect(prisma.$transaction).toHaveBeenCalledOnce()
  })

  it('cleans all uploaded paths when a later upload or database transaction fails', async () => {
    const storage = { upload: vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('failed')), remove: vi.fn().mockResolvedValue(undefined) }
    const prisma = makePrisma()
    const service = createReportService({ prisma, storage, clock: () => new Date('2026-08-22T04:00:00Z') })
    const twoFiles = [files[0], { ...files[0], originalname: 'second.jpg' }]

    await expect(service.createReport({ actor: { id: 'user-1', role: 'PEGAWAI' }, fields: { tanggalKegiatan: '2026-08-22', rwId: 'rw-1', tahapanId: 'stage-1', keterangan: 'Kegiatan lapangan selesai' }, files: twoFiles })).rejects.toMatchObject({ code: 'STORAGE_ERROR' })
    expect(storage.remove).toHaveBeenCalledOnce()

    const failingStorage = { upload: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined) }
    const failingService = createReportService({ prisma: makePrisma({ transactionFails: true }), storage: failingStorage, clock: () => new Date('2026-08-22T04:00:00Z') })
    await expect(failingService.createReport({ actor: { id: 'user-1', role: 'PEGAWAI' }, fields: { tanggalKegiatan: '2026-08-22', rwId: 'rw-1', tahapanId: 'stage-1', keterangan: 'Kegiatan lapangan selesai' }, files })).rejects.toMatchObject({ code: 'DATABASE_ERROR' })
    expect(failingStorage.remove).toHaveBeenCalledOnce()
  })

  it('creates 600-second signed URLs for an authorized detail', async () => {
    const storage = { createSignedUrl: vi.fn().mockResolvedValue('signed') }
    const service = createReportService({ prisma: makePrisma(), storage })
    const detail = await service.getReportDetail({ actor: { id: 'user-1', role: 'PEGAWAI' }, reportId: 'report-1' })

    expect(detail.dokumentasi[0].signedUrl).toBe('signed')
    expect(storage.createSignedUrl).toHaveBeenCalledWith('reports/report-1/1.jpg', 600)
  })
})
