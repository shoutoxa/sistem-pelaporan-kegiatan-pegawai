import { describe, expect, it, vi } from 'vitest'
import { createReportService } from '../src/modules/laporan/report.service.js'

function makePrisma({ transactionFails = false } = {}) {
  const tx = {
    laporan: { create: vi.fn().mockResolvedValue({ id: 'report-1', createdAt: new Date('2026-08-22T01:00:00Z') }) },
    dokumentasi: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
  }
  return {
    rw: { findFirst: vi.fn().mockResolvedValue({ id: 'rw-1', isActive: true, desa: { isActive: true } }) },
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
    expect(storage.upload.mock.calls[0][0].path).toMatch(/^laporan\/user-1\/2026-08-22\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/)
  })

  it('rejects an RW whose parent Desa is inactive', async () => {
    const prisma = makePrisma()
    prisma.rw.findFirst.mockResolvedValue(null)
    const storage = { upload: vi.fn(), remove: vi.fn() }
    const service = createReportService({ prisma, storage, clock: () => new Date('2026-08-22T04:00:00Z') })

    await expect(service.createReport({ actor: { id: 'user-1', role: 'PEGAWAI' }, fields: { tanggalKegiatan: '2026-08-22', rwId: 'rw-inactive-parent', tahapanId: 'stage-1', keterangan: 'Kegiatan lapangan selesai' }, files })).rejects.toMatchObject({ code: 'REFERENCE_INVALID' })
    expect(prisma.rw.findFirst).toHaveBeenCalledWith({ where: { id: 'rw-inactive-parent', isActive: true, desa: { isActive: true } } })
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
    const prisma = makePrisma()
    prisma.laporan.findFirst.mockImplementation(async ({ include }) => ({
      id: 'report-1',
      userId: 'user-1',
      createdAt: new Date('2026-08-22T01:00:00Z'),
      dokumentasi: [{ storagePath: 'reports/report-1/1.jpg' }],
      ...(include?.rw?.include?.desa ? { rw: { nomorRw: 'RW 01', desa: { namaDesa: 'Dewasari' } } } : {}),
      ...(include?.tahapan ? { tahapan: { namaTahapan: 'Penanaman Tiang' } } : {}),
      ...(include?.user ? { user: { nama: 'Pegawai Dewasari' } } : {}),
    }))
    const service = createReportService({ prisma, storage, clock: () => new Date('2026-08-22T04:00:00Z') })
    const detail = await service.getReportDetail({ actor: { id: 'user-1', role: 'PEGAWAI' }, reportId: 'report-1' })

    expect(detail.dokumentasi[0].signedUrl).toBe('signed')
    expect(detail).toMatchObject({ canEdit: true, rw: { nomorRw: 'RW 01', desa: { namaDesa: 'Dewasari' } }, tahapan: { namaTahapan: 'Penanaman Tiang' }, user: { nama: 'Pegawai Dewasari' } })
    expect(detail.editableUntil).toBe('2026-08-23T01:00:00.000Z')
    expect(storage.createSignedUrl).toHaveBeenCalledWith('reports/report-1/1.jpg', 600)
  })

  it('accepts owner edits within 24 hours and rejects older reports', async () => {
    const prisma = makePrisma()
    prisma.laporan.findFirst = vi.fn().mockResolvedValue({ id: 'report-1', userId: 'user-1', createdAt: new Date('2026-08-21T12:00:00Z') })
    prisma.laporan.update = vi.fn().mockResolvedValue({ id: 'report-1', keterangan: 'Updated' })
    const service = createReportService({ prisma, storage: {}, clock: () => new Date('2026-08-22T01:00:00Z') })

    await expect(service.updateReport({ actor: { id: 'user-1', role: 'PEGAWAI' }, reportId: 'report-1', fields: { keterangan: 'Updated description' } })).resolves.toMatchObject({ id: 'report-1' })
    prisma.laporan.findFirst.mockResolvedValue({ id: 'report-1', userId: 'user-1', createdAt: new Date('2026-08-20T12:00:00Z') })
    await expect(service.updateReport({ actor: { id: 'user-1', role: 'PEGAWAI' }, reportId: 'report-1', fields: { keterangan: 'Too late' } })).rejects.toMatchObject({ code: 'EDIT_EXPIRED' })
  })

  it('applies create-time date and active-parent rules when editing', async () => {
    const prisma = makePrisma()
    prisma.laporan.findFirst = vi.fn().mockResolvedValue({ id: 'report-1', userId: 'user-1', createdAt: new Date('2026-08-22T00:00:00Z'), tahapanId: 'stage-1', nomorPerangkat: null })
    prisma.laporan.update = vi.fn().mockResolvedValue({ id: 'report-1' })
    prisma.rw.findFirst.mockResolvedValue(null)
    const service = createReportService({ prisma, storage: {}, clock: () => new Date('2026-08-22T04:00:00Z') })

    await expect(service.updateReport({ actor: { id: 'user-1' }, reportId: 'report-1', fields: { tanggalKegiatan: '2026-08-19' } })).rejects.toMatchObject({ code: 'DATE_VALIDATION' })
    await expect(service.updateReport({ actor: { id: 'user-1' }, reportId: 'report-1', fields: { rwId: 'rw-bad' } })).rejects.toMatchObject({ code: 'REFERENCE_INVALID' })
    expect(prisma.rw.findFirst).toHaveBeenCalledWith({ where: { id: 'rw-bad', isActive: true, desa: { isActive: true } } })
  })

  it('requires and clears device numbers according to the resulting stage', async () => {
    const prisma = makePrisma()
    prisma.laporan.findFirst = vi.fn().mockResolvedValue({ id: 'report-1', userId: 'user-1', createdAt: new Date('2026-08-22T00:00:00Z'), tahapanId: 'stage-1', nomorPerangkat: 'ODP-01' })
    prisma.laporan.update = vi.fn().mockResolvedValue({ id: 'report-1' })
    const service = createReportService({ prisma, storage: {}, clock: () => new Date('2026-08-22T04:00:00Z') })

    prisma.tahapan.findFirst.mockResolvedValueOnce({ id: 'stage-required', requiresNomorPerangkat: true })
    await expect(service.updateReport({ actor: { id: 'user-1' }, reportId: 'report-1', fields: { tahapanId: 'stage-required' } })).rejects.toMatchObject({ code: 'VALIDATION' })

    prisma.tahapan.findFirst.mockResolvedValueOnce({ id: 'stage-optional', requiresNomorPerangkat: false })
    await service.updateReport({ actor: { id: 'user-1' }, reportId: 'report-1', fields: { tahapanId: 'stage-optional' } })
    expect(prisma.laporan.update).toHaveBeenLastCalledWith({ where: { id: 'report-1' }, data: { tahapanId: 'stage-optional', nomorPerangkat: null } })
  })
})
