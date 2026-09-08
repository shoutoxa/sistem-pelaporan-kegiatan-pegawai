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
    listUserClusters: vi.fn().mockResolvedValue([{ id: id(4), project_id: id(3), pic_id: id(7) }]),
    getUserReportStatus: vi.fn().mockImplementation(async (userId) => ({ user_id: userId, wajib_lapor: true, tanggal: '2026-09-07', clusters: [{ cluster_id: id(4), sudah_lapor: userId === id(7), laporan_id: userId === id(7) ? id(6) : null, laporan_status: userId === id(7) ? 'PENDING' : null }] })),
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
  it('uses company identity for ownership and creation without querying local mappings', async () => {
    const { service, client, repository } = setup()
    repository.identity.mockRejectedValue(new Error('no local database'))
    const actor = { id: id(7), externalUserId: id(7), authSource: 'ftth', identitySource: 'ftth', role: 'PEGAWAI' }
    expect((await service.list(actor, {}))).toHaveLength(1)
    await service.create(actor, fields, [file])
    expect(client.createReport).toHaveBeenCalledWith(expect.objectContaining({ user_id: id(7) }))
    expect(repository.identity).not.toHaveBeenCalled()
    client.getReport.mockResolvedValue({ ...report, user_id: id(99) })
    await expect(service.detail(actor, report.id)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('aggregates all company reports and does not invent missing wajib lapor', async () => {
    const { service, client } = setup()
    client.listUsers = vi.fn().mockResolvedValue([{ id: id(7), is_active: true }])
    const result = await service.dashboard(admin)
    expect(result.source).toBe('ftth')
    expect(result.jumlahLaporan).toBe(1)
    expect(result.wajibLapor).toBeNull()
    expect(result.distribusiDesa[0].jumlah).toBe(1)
    client.listUsers.mockResolvedValue([{ id: id(7), is_active: true, wajib_lapor: true }, { id: id(90), is_active: true, wajib_lapor: true }])
    const complete = await service.dashboard(admin)
    expect(complete.wajibLapor).toBe(2)
    expect(complete.sudahMelapor).toBe(1)
    expect(complete.belumMelapor).toBe(1)
    await expect(service.dashboard(employee)).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
  it('filters documentation by company IDs, retains document types and validates ownership', async () => {
    const { service, client } = setup()
    client.listReports.mockResolvedValue([{ ...report, dokumentasi: [{ id: id(9), laporan_id: report.id, mime_type: 'application/pdf', original_name: 'sitac.pdf' }] }])
    const data = await service.documentation(admin, { projectId: report.project_id })
    expect(data.source).toBe('ftth')
    expect(data.items[0].mimeType).toBe('application/pdf')
    expect(data.items[0].downloadUrl).toContain(`/reports/${report.id}/attachments/${id(9)}/download`)
    expect((await service.documentation(admin, { clusterId: id(99) })).total).toBe(0)
    await expect(service.documentation(employee)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    client.listReports.mockResolvedValue([{ ...report, dokumentasi: [{ id: id(9), laporan_id: id(99) }] }])
    await expect(service.documentation(admin)).rejects.toMatchObject({ code: 'INTEGRATION_INVALID_RESPONSE' })
  })
  it('does not require Supabase storage for FTTH attachment details', async () => {
    const { client, repository } = setup()
    client.listAttachments.mockResolvedValue([{ id: id(9), laporan_id: report.id, file_url: 'ftth-laporan/6/abc.png', mime_type: 'image/png', original_name: 'foto.png' }])
    const service = createFtthReportService({ client, repository })
    const result = await service.detail(admin, report.id)
    expect(result.dokumentasi[0].signedUrl).toBeNull()
    expect(result.dokumentasi[0].downloadUrl).toContain(`/reports/${report.id}/attachments/${id(9)}/download`)
  })
  it('searches only names across company relations and paginates after matching', async () => {
    const { service, client } = setup()
    client.listReports.mockResolvedValue([{ ...report, user: { full_name: 'Ayu' }, project: { name: 'Project Barat' }, cluster: { name: 'RW 05' }, masterProcess: { name: 'Pemasangan' }, keterangan: 'rahasia', nomor_perangkat: 'ODP-999' }])
    for (const search of ['ayu', 'barat', 'rw 05', 'pemasangan']) {
      const result = await service.listAdminReports(admin, { search })
      expect(result.total).toBe(1)
      expect(result.items[0].pekerjaan.namaPekerjaan).toBe('Pemasangan')
      expect(result.source).toBe('ftth')
    }
    for (const search of ['rahasia', 'ODP-999']) expect((await service.listAdminReports(admin, { search })).total).toBe(0)
    await expect(service.listAdminReports(employee)).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
  it('searches beyond the first remote page and rejects repeated pages', async () => {
    const { service, client } = setup()
    const batch = Array.from({ length: 100 }, (_, n) => ({ ...report, id: id(n + 100) }))
    client.listReports.mockResolvedValueOnce(batch).mockResolvedValueOnce([{ ...report, user: { full_name: 'Target' } }])
    expect((await service.listAdminReports(admin, { search: 'Target' })).total).toBe(1)
    expect(client.listReports).toHaveBeenCalledWith({ limit: 100, offset: 100 })
    client.listReports.mockResolvedValue(batch)
    await expect(service.listAdminReports(admin)).rejects.toMatchObject({ code: 'INTEGRATION_INVALID_RESPONSE' })
  })
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
    const { service, client } = setup()
    client.listUserClusters.mockResolvedValue([])
    await expect(service.create(employee, fields, [file])).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
  it('uses official assignments even when the local allowlist is empty, and rechecks before writing', async () => {
    const { service, client, repository } = setup()
    repository.identity.mockResolvedValue({ externalUserId: id(7), allowedClusterIds: [] })
    expect((await service.references(employee)).clusters.map((item) => item.id)).toEqual([id(4)])
    client.listUserClusters.mockResolvedValue([])
    await expect(service.create(employee, fields, [file])).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(client.createReport).not.toHaveBeenCalled()
    client.listUserClusters.mockRejectedValue(new Error('unavailable'))
    await expect(service.references(employee)).rejects.toThrow('unavailable')
  })
  it('denies access to another employee status and assignment before remote lookup', async () => {
    const { service, client } = setup()
    await expect(service.userClusters(employee, id(90))).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(service.userReportStatus(employee, id(90))).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(client.listUserClusters).not.toHaveBeenCalled()
    expect(client.getUserReportStatus).not.toHaveBeenCalled()
    client.listUserClusters.mockResolvedValue([{ id: id(4), project_id: id(3), password_hash: 'never-forward' }])
    expect(JSON.stringify(await service.userClusters(employee, id(7)))).not.toContain('password_hash')
  })
  it('requires every assigned cluster and rejects stale daily status', async () => {
    const { service, client } = setup()
    client.listUsers = vi.fn().mockResolvedValue([{ id: id(7), wajib_lapor: true }, { id: id(90), wajib_lapor: false }])
    client.getUserReportStatus.mockResolvedValue({ user_id: id(7), wajib_lapor: true, tanggal: '2026-09-07', clusters: [
      { cluster_id: id(4), sudah_lapor: true, laporan_status: 'PENDING', laporan_id: id(6) },
      { cluster_id: id(40), sudah_lapor: false, laporan_status: null, laporan_id: null },
    ] })
    const result = await service.dashboard(admin)
    expect(result.sudahMelapor).toBe(0)
    expect(result.belumMelapor).toBe(1)
    expect(result.kepatuhanCluster).toEqual({ total: 2, sudah: 1, belum: 1, tanpaPenugasan: 0 })
    expect(client.getUserReportStatus).toHaveBeenCalledTimes(1)
    client.getUserReportStatus.mockResolvedValue({ user_id: id(7), wajib_lapor: true, tanggal: '2026-09-06', clusters: [] })
    await expect(service.dashboard(admin)).rejects.toMatchObject({ code: 'INTEGRATION_INVALID_RESPONSE' })
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
