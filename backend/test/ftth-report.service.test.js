import { describe, it, expect, vi } from 'vitest'
import { createFtthReportService, ftthFileUrl } from '../src/modules/integration/ftth-report.service.js'
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const employee = { id: id(1), role: 'PEGAWAI' }
const admin = { id: id(2), role: 'SUPERADMIN' }
const fields = { project_id: id(3), cluster_id: id(4), process_id: id(5), tanggal_kegiatan: '2026-09-07', keterangan: 'Pemasangan selesai' }
const report = { ...fields, id: id(6), user_id: id(7), status: 'PENDING' }
const file = { originalname: 'foto.png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1kAAAAASUVORK5CYII=', 'base64') }
function setup() {
  const client = {
    uploadAttachment: vi.fn().mockImplementation(async (file) => ({ file_url: '/uploads/test-file.png', mime_type: file.mimetype, file_size: file.size })),
    getUser: vi.fn().mockResolvedValue({ id: id(7), is_active: true }),
    getProject: vi.fn().mockResolvedValue({ id: id(3) }),
    getCluster: vi.fn().mockResolvedValue({ id: id(4), project_id: id(3) }),
    getProcess: vi.fn().mockResolvedValue({ id: id(5), master_category_id: id(8), allow_file: true }),
    listCategories: vi.fn().mockResolvedValue([{ id: id(8), is_active: true }]),
    listProjects: vi.fn().mockResolvedValue([{ id: id(3) }]),
    listClusters: vi.fn().mockResolvedValue([{ id: id(4), project_id: id(3) }]),
    listProcesses: vi.fn().mockResolvedValue([{ id: id(5), master_category_id: id(8) }]),
    createReport: vi.fn().mockResolvedValue(report), getReport: vi.fn().mockResolvedValue(report),
    listReports: vi.fn().mockResolvedValue([report]), createAttachment: vi.fn().mockResolvedValue({ id: id(9) }),
    listAttachments: vi.fn().mockResolvedValue([]), downloadAttachment: vi.fn(), updateReport: vi.fn().mockResolvedValue(report), deleteReport: vi.fn(),
  }
  const repository = {
    identity: vi.fn().mockResolvedValue({ externalUserId: id(7), allowedClusterIds: [id(4)] }),
    localUser: vi.fn().mockResolvedValue({ id: id(1) }), saveMapping: vi.fn(),
    prepareUpload: vi.fn(), markUpload: vi.fn(), recordRemoteUpload: vi.fn(), mappings: vi.fn(), pendingUploads: vi.fn(),
  }
  const storage = { upload: vi.fn(), createSignedUrl: vi.fn().mockResolvedValue('https://storage.test/signed'), remove: vi.fn() }
  return { client, repository, storage, service: createFtthReportService({ client, repository, storage, clock: () => new Date('2026-09-07T10:00:00Z') }) }
}
describe('FTTH report flow', () => {
  it.each(['https://evil.test/a.jpg', '/uploads/../private.jpg', '/uploads/a.jpg?x=1', '//evil.test/a.jpg', '/uploads/a.html', '/uploads/a%2fsecret.jpg'])('rejects unsafe remote path %s', (path) => {
    expect(ftthFileUrl(path)).toBeNull()
  })
  it('resolves documented path only on FTTH host', () => {
    expect(ftthFileUrl('/uploads/test.pdf')).toBe('https://ftth.digitak.id/ftth/uploads/test.pdf')
  })
  it('does not retry failed upload or register metadata', async () => {
    const { service, client } = setup()
    client.uploadAttachment.mockRejectedValue(new Error('timeout'))
    expect((await service.create(employee, fields, [file])).warnings).toHaveLength(1)
    expect(client.uploadAttachment).toHaveBeenCalledTimes(1)
    expect(client.createAttachment).not.toHaveBeenCalled()
  })
  it.each(['user_id', 'status', 'verified_by', 'verified_at', 'diterima'])('rejects forged %s before any write', async (name) => {
    const { service, client } = setup()
    await expect(service.create(employee, { ...fields, [name]: id(99) }, [file])).rejects.toMatchObject({ code: 'VALIDATION' })
    expect(client.createReport).not.toHaveBeenCalled()
  })
  it('requires an explicit local mapping', async () => {
    const { service, repository, client } = setup()
    repository.identity.mockResolvedValue(null)
    await expect(service.create(employee, fields, [file])).rejects.toMatchObject({ code: 'MAPPING_REQUIRED' })
    expect(client.createReport).not.toHaveBeenCalled()
  })
  it('uploads to FTTH and journals remote path before metadata', async () => {
    const { service, client, repository, storage } = setup()
    const result = await service.create(employee, fields, [file])
    expect(client.createReport).toHaveBeenCalledWith(expect.objectContaining({ user_id: id(7), status: 'PENDING', verified_by: null }))
    expect(client.createAttachment).toHaveBeenCalledWith(expect.objectContaining({ laporan_id: id(6), file_url: '/uploads/test-file.png', mime_type: 'image/png', tipe_berkas: 'foto' }))
    expect(repository.recordRemoteUpload).toHaveBeenCalledWith(expect.any(String), '/uploads/test-file.png')
    expect(storage.upload).not.toHaveBeenCalled()
    expect(repository.markUpload).toHaveBeenLastCalledWith(expect.any(String), 'SYNCED')
    expect(storage.createSignedUrl).not.toHaveBeenCalled()
    expect(result.warnings).toEqual([])
  })
  it('rejects fake file content before creating report', async () => {
    const { service, client } = setup()
    await expect(service.create(employee, fields, [{ ...file, buffer: Buffer.from('not a photo') }])).rejects.toThrow()
    expect(client.createReport).not.toHaveBeenCalled()
  })
  it('rejects cluster/project mismatch', async () => {
    const { service, client } = setup()
    client.getCluster.mockResolvedValue({ id: id(4), project_id: id(99) })
    await expect(service.create(employee, fields, [file])).rejects.toMatchObject({ code: 'VALIDATION' })
    expect(client.createReport).not.toHaveBeenCalled()
  })
  it('rejects unassigned clusters', async () => {
    const { service, repository } = setup()
    repository.identity.mockResolvedValue({ externalUserId: id(7), allowedClusterIds: [] })
    await expect(service.create(employee, fields, [file])).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
  it('retains evidence and report ID on ambiguous metadata write', async () => {
    const { service, client, storage, repository } = setup()
    client.createAttachment.mockRejectedValue(new Error('timeout'))
    const result = await service.create(employee, fields, [file])
    expect(result.id).toBe(id(6)); expect(result.warnings).toHaveLength(1)
    expect(client.createReport).toHaveBeenCalledTimes(1)
    expect(client.createAttachment).toHaveBeenCalledTimes(1)
    expect(storage.remove).not.toHaveBeenCalled()
    expect(repository.recordRemoteUpload).toHaveBeenCalledWith(expect.any(String), '/uploads/test-file.png')
    expect(repository.markUpload).not.toHaveBeenCalled()
  })
  it('does not retry ambiguous report creation or start uploading', async () => {
    const { service, client, storage } = setup()
    client.createReport.mockRejectedValue(new Error('timeout'))
    await expect(service.create(employee, fields, [file])).rejects.toMatchObject({ code: 'WRITE_UNCONFIRMED' })
    expect(client.createReport).toHaveBeenCalledTimes(1)
    expect(storage.upload).not.toHaveBeenCalled()
  })
  it('supports PDF documents and rejects inactive processes', async () => {
    const { service, client } = setup()
    await service.create(employee, fields, [{ originalname: 'izin.pdf', buffer: Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n') }])
    expect(client.createAttachment).toHaveBeenCalledWith(expect.objectContaining({ mime_type: 'application/pdf', tipe_berkas: 'dokumen' }))
    client.getProcess.mockResolvedValue({ id: id(5), master_category_id: id(8), is_active: false })
    await expect(service.create(employee, fields, [file])).rejects.toMatchObject({ code: 'VALIDATION' })
  })
  it('records mapped verifier and requires rejection note', async () => {
    const { service, client } = setup()
    await service.setStatus(admin, id(6), { status: 'APPROVED' })
    expect(client.updateReport).toHaveBeenCalledWith(id(6), expect.objectContaining({ verified_by: id(7), verified_at: '2026-09-07T10:00:00.000Z' }))
    await expect(service.setStatus(admin, id(6), { status: 'REJECTED' })).rejects.toMatchObject({ code: 'VALIDATION' })
  })
  it('does not leak another employee report even if remote ignores filter', async () => {
    const { service, client } = setup()
    client.listReports.mockResolvedValue([report, { ...report, id: id(10), user_id: id(11) }])
    expect(await service.list(employee, {})).toHaveLength(1)
    expect(client.listReports).toHaveBeenCalledWith({ limit: 25, offset: 0, user_id: id(7) })
    client.getReport.mockResolvedValue({ ...report, user_id: id(11) })
    await expect(service.detail(employee, id(6))).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('forbids employee edits, status, delete and mapping', async () => {
    const { service, client } = setup()
    for (const operation of [() => service.update(employee, id(6), fields), () => service.setStatus(employee, id(6), { status: 'APPROVED' }), () => service.remove(employee, id(6)), () => service.saveMapping(employee, id(1), {})]) {
      await expect(operation()).rejects.toMatchObject({ code: 'FORBIDDEN' })
    }
    expect(client.updateReport).not.toHaveBeenCalled(); expect(client.deleteReport).not.toHaveBeenCalled()
  })
  it('locks approved reports, allows reopening and admin historical correction', async () => {
    const { service, client } = setup()
    client.getReport.mockResolvedValue({ ...report, status: 'APPROVED' })
    await expect(service.update(admin, id(6), fields)).rejects.toMatchObject({ code: 'LOCKED' })
    await service.setStatus(admin, id(6), { status: 'PENDING' })
    expect(client.updateReport).toHaveBeenLastCalledWith(id(6), { status: 'PENDING', catatan_revisi: '', verified_by: null, verified_at: null })
    client.getReport.mockResolvedValue(report)
    await service.update(admin, id(6), { ...fields, tanggal_kegiatan: '2020-01-01' })
    expect(client.updateReport).toHaveBeenLastCalledWith(id(6), expect.objectContaining({ tanggal_kegiatan: '2020-01-01' }))
  })
  it('signs only owned attachments inside controlled prefix', async () => {
    const { service, client, storage } = setup()
    client.listAttachments.mockResolvedValue([
      { id: id(9), laporan_id: id(6), file_url: `ftth-laporan/${id(6)}/${id(20)}.pdf` },
      { id: id(10), laporan_id: id(6), file_url: 'laporan/private/other.jpg' },
      { id: id(11), laporan_id: id(21), file_url: `ftth-laporan/${id(21)}/${id(20)}.pdf` },
    ])
    const result = await service.detail(employee, id(6))
    expect(result.dokumentasi).toHaveLength(2)
    expect(result.dokumentasi[1].signedUrl).toBeNull()
    expect(storage.createSignedUrl).toHaveBeenCalledTimes(1)
  })
  it('downloads an attachment only through its authorized report', async () => {
    const { service, client } = setup()
    client.listAttachments.mockResolvedValue([{ id: id(9), laporan_id: id(6), original_name: 'foto.png', mime_type: 'image/png' }])
    client.downloadAttachment.mockResolvedValue({ headers: { get: () => 'image/png' }, arrayBuffer: async () => Uint8Array.from([1, 2, 3]) })
    const result = await service.download(employee, id(6), id(9))
    expect(result).toMatchObject({ filename: 'foto.png', mimeType: 'image/png' })
    expect(result.buffer).toEqual(Buffer.from([1, 2, 3]))
    expect(client.downloadAttachment).toHaveBeenCalledWith(id(9), { forceDownload: false })
  })
  it('rejects arbitrary list filters', async () => {
    const { service } = setup()
    await expect(service.list(employee, { user_id: id(99) })).rejects.toMatchObject({ code: 'VALIDATION' })
  })
})
