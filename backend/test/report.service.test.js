import { describe, expect, it, vi } from 'vitest'
import { createReportService } from '../src/modules/laporan/report.service.js'

describe('report service with FTTH API', () => {
  const files = [{ buffer: Buffer.from('photo'), originalname: 'photo.jpg', mimetype: 'image/jpeg', size: 5 }]

  function makeFtthApi() {
    return {
      getClusterById: vi.fn().mockResolvedValue({ id: 'clust-1', name: 'RW 01' }),
      getMasterProcessById: vi.fn().mockResolvedValue({ id: 'proc-1', name: 'Penarikan Kabel' }),
      createReport: vi.fn().mockResolvedValue({ id: 'report-1' }),
      uploadDocumentation: vi.fn().mockResolvedValue({ file_url: '/uploads/doc1.png' }),
      createDocumentation: vi.fn().mockResolvedValue({ id: 'doc-1' }),
      getReportById: vi.fn().mockResolvedValue({
        id: 'report-1',
        user_id: 'user-1',
        created_at: '2026-08-22T01:00:00Z',
        status: 'PENDING',
        dokumentasi: [{ id: 'doc-1', file_url: '/uploads/doc1.png' }],
      }),
      updateReport: vi.fn().mockResolvedValue({ id: 'report-1', keterangan: 'Updated' }),
      deleteReport: vi.fn().mockResolvedValue({ id: 'report-1', deleted: true }),
    }
  }

  it('uploads files and persists one report to FTTH API', async () => {
    const ftthApi = makeFtthApi()
    const service = createReportService({ ftthApi, clock: () => new Date('2026-08-22T04:00:00Z') })

    const result = await service.createReport({
      actor: { id: 'user-1', role: 'PEGAWAI' },
      fields: { tanggalKegiatan: '2026-08-22', clusterId: 'clust-1', processId: 'proc-1', keterangan: 'Kegiatan lapangan selesai' },
      files,
    })

    expect(result).toMatchObject({ id: 'report-1' })
    expect(ftthApi.createReport).toHaveBeenCalledOnce()
    expect(ftthApi.uploadDocumentation).toHaveBeenCalledOnce()
    expect(ftthApi.createDocumentation).toHaveBeenCalledOnce()
  })

  it('rejects an invalid cluster reference', async () => {
    const ftthApi = makeFtthApi()
    ftthApi.getClusterById.mockResolvedValue(null)
    const service = createReportService({ ftthApi, clock: () => new Date('2026-08-22T04:00:00Z') })

    await expect(
      service.createReport({
        actor: { id: 'user-1', role: 'PEGAWAI' },
        fields: { tanggalKegiatan: '2026-08-22', clusterId: 'bad-clust', processId: 'proc-1', keterangan: 'Kegiatan lapangan selesai' },
        files,
      })
    ).rejects.toMatchObject({ code: 'REFERENCE_INVALID' })
  })

  it('resolves detail with FTTH storage links and edit permissions', async () => {
    const ftthApi = makeFtthApi()
    const service = createReportService({ ftthApi, clock: () => new Date('2026-08-22T04:00:00Z') })

    const detail = await service.getReportDetail({ actor: { id: 'user-1', role: 'PEGAWAI' }, reportId: 'report-1' })

    expect(detail).toMatchObject({ id: 'report-1', canEdit: true })
    expect(detail.dokumentasi[0].signedUrl).toBe('https://ftth.digitak.id/uploads/doc1.png')
  })

  it('accepts owner edits and updates report in FTTH API', async () => {
    const ftthApi = makeFtthApi()
    const service = createReportService({ ftthApi, clock: () => new Date('2026-08-22T04:00:00Z') })

    const result = await service.updateReport({
      actor: { id: 'user-1', role: 'PEGAWAI' },
      reportId: 'report-1',
      fields: { keterangan: 'Keterangan baru diupdate' },
    })

    expect(result).toMatchObject({ id: 'report-1' })
    expect(ftthApi.updateReport).toHaveBeenCalledWith('report-1', expect.objectContaining({ keterangan: 'Keterangan baru diupdate' }))
  })

  it('locks approved reports against updates', async () => {
    const ftthApi = makeFtthApi()
    ftthApi.getReportById.mockResolvedValue({ id: 'report-1', user_id: 'user-1', status: 'APPROVED' })
    const service = createReportService({ ftthApi, clock: () => new Date('2026-08-22T04:00:00Z') })

    await expect(
      service.updateReport({
        actor: { id: 'user-1', role: 'PEGAWAI' },
        reportId: 'report-1',
        fields: { keterangan: 'Coba update' },
      })
    ).rejects.toMatchObject({ code: 'LOCKED' })
  })

  it('allows Superadmin to delete report', async () => {
    const ftthApi = makeFtthApi()
    const service = createReportService({ ftthApi })

    await expect(
      service.deleteReport({ actor: { id: 'admin-1', role: 'SUPERADMIN' }, reportId: 'report-1' })
    ).resolves.toMatchObject({ id: 'report-1', deleted: true })
    expect(ftthApi.deleteReport).toHaveBeenCalledWith('report-1')
  })

  it('forbids Pegawai from deleting report', async () => {
    const ftthApi = makeFtthApi()
    const service = createReportService({ ftthApi })

    await expect(
      service.deleteReport({ actor: { id: 'user-1', role: 'PEGAWAI' }, reportId: 'report-1' })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
