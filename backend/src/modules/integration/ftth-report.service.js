import { randomUUID } from 'node:crypto'
import { fileTypeFromBuffer } from 'file-type'
import { fieldsSchema, mappingSchema, statusSchema, pageSchema, idSchema, parse, row, rows, fail } from './ftth-report.schemas.js'
import { jakartaDate } from '../laporan/report.schemas.js'

const formats = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'], ['application/pdf', 'pdf']])
// Only server-generated leaf paths from the documented FTTH upload directory.
export function ftthFileUrl(path) {
  return typeof path === 'string' && /^\/uploads\/[a-zA-Z0-9][a-zA-Z0-9_-]*\.(pdf|jpe?g|png|gif|bmp|webp|kmz|kml|docx?|xlsx?)$/i.test(path)
    ? `https://ftth.digitak.id/ftth${path}` : null
}
function admin(actor) {
  if (actor?.role !== 'SUPERADMIN') throw fail('FORBIDDEN', 'Hanya admin yang dapat melakukan tindakan ini.')
}
function active(item) { return item.is_active !== false && !item.deleted_at }
const label = (item) => item.full_name || item.name || item.nama || item.project_name || item.cluster_name || item.id
function summary(item) {
  return {
    id: item.id, user_id: item.user_id, project_id: item.project_id, cluster_id: item.cluster_id,
    process_id: item.process_id, tanggal_kegiatan: item.tanggal_kegiatan,
    keterangan: item.keterangan, nomor_perangkat: item.nomor_perangkat,
    status: item.status, catatan_revisi: item.catatan_revisi,
    created_at: item.created_at, project_name: item.project ? label(item.project) : item.project_id,
    cluster_name: item.cluster ? label(item.cluster) : item.cluster_id,
    process_name: item.masterProcess || item.process ? label(item.masterProcess || item.process) : item.process_id,
    user_name: item.user ? label(item.user) : item.user_id,
  }
}

export function createFtthReportService({ client, repository, storage, clock = () => new Date() }) {
  async function identity(actor) {
    if (!actor || !['SUPERADMIN', 'PEGAWAI'].includes(actor.role)) throw fail('FORBIDDEN', 'Akses tidak diizinkan.')
    const mapping = actor.authSource === 'ftth' && actor.identitySource === 'ftth'
      ? { externalUserId: parse(idSchema, actor.id) } : await repository.identity(actor.id)
    if (!mapping) throw fail('MAPPING_REQUIRED', 'Akun belum dipetakan ke FTTH. Hubungi admin.')
    const user = row(await client.getUser(mapping.externalUserId))
    if (user.id !== mapping.externalUserId || !active(user)) throw fail('FORBIDDEN', 'Akun FTTH tidak aktif atau tidak cocok.')
    return mapping
  }
  async function all(fetchPage) {
    const result = []
    const seen = new Set()
    for (let offset = 0; offset < 10000; offset += 1000) {
      const batch = rows(await fetchPage({ limit: 1000, offset }))
      for (const item of batch) {
        if (seen.has(item.id)) throw fail('INTEGRATION_INVALID_RESPONSE', 'Pagination FTTH mengembalikan ID berulang.')
        seen.add(item.id)
      }
      result.push(...batch)
      if (batch.length < 1000) return result
    }
    throw fail('INTEGRATION_INVALID_RESPONSE', 'Master terlalu besar untuk mode development; diperlukan pencarian server.')
  }
  async function references(actor) {
    const mapping = actor.role === 'SUPERADMIN' ? null : await identity(actor)
    const [projects, clusters, categories, processes] = await Promise.all([
      all(client.listProjects), mapping ? assignedClusters(mapping.externalUserId) : all(client.listClusters), client.listCategories().then(rows), client.listProcesses().then(rows),
    ])
    const visible = clusters.filter(active)
    return {
      projects: projects.filter((item) => active(item) && visible.some((c) => c.project_id === item.id)).map((item) => ({ id: item.id, name: label(item) })),
      clusters: visible.map((item) => ({ id: item.id, name: label(item), project_id: item.project_id })),
      categories: categories.filter(active).map((item) => ({ id: item.id, name: label(item) })),
      processes: processes.filter((item) => active(item) && categories.some((category) => category.id === item.master_category_id && active(category)))
        .map((item) => ({ id: item.id, name: label(item), master_category_id: item.master_category_id, allow_file: item.allow_file, input_instruction: item.input_instruction })),
    }
  }
  async function mappings(actor) {
    admin(actor)
    if (actor.identitySource === 'ftth') return { users: [], pendingUploads: await repository.pendingUploads(), identitySource: 'ftth' }
    return { users: await repository.mappings(), pendingUploads: await repository.pendingUploads() }
  }
  async function saveMapping(actor, localUserId, input) {
    admin(actor)
    if (actor.identitySource === 'ftth') throw fail('FORBIDDEN', 'Identitas akun dikelola langsung oleh FTTH.')
    parse(idSchema, localUserId)
    const data = parse(mappingSchema, input)
    if (!await repository.localUser(localUserId)) throw fail('NOT_FOUND', 'Akun lokal aktif tidak ditemukan.')
    const user = row(await client.getUser(data.externalUserId))
    if (user.id !== data.externalUserId || !active(user)) throw fail('VALIDATION', 'Akun FTTH tidak aktif atau tidak cocok.')
    for (const id of data.allowedClusterIds) {
      const cluster = row(await client.getCluster(id))
      if (cluster.id !== id || !active(cluster)) throw fail('VALIDATION', 'Cluster tidak aktif atau tidak cocok.')
    }
    try { return await repository.saveMapping(localUserId, { ...data, allowedClusterIds: [...new Set(data.allowedClusterIds)] }) }
    catch (error) {
      if (error.code === 'P2002') throw fail('VALIDATION', 'Akun FTTH sudah dipetakan ke akun lokal lain.')
      throw error
    }
  }
  async function validateReferences(data, actor, mapping) {
    const [project, cluster, process, categories] = await Promise.all([
      client.getProject(data.project_id).then(row), client.getCluster(data.cluster_id).then(row),
      client.getProcess(data.process_id).then(row), client.listCategories().then(rows),
    ])
    if (project.id !== data.project_id || cluster.id !== data.cluster_id || process.id !== data.process_id ||
        !active(project) || !active(cluster) || !active(process) || cluster.project_id !== project.id ||
        !categories.some((category) => category.id === process.master_category_id && active(category))) {
      throw fail('VALIDATION', 'Project, cluster, atau pekerjaan tidak aktif/tidak sesuai.')
    }
    if (actor.role !== 'SUPERADMIN' && !(await assignedClusters(mapping.externalUserId)).some((item) => item.id === cluster.id && item.project_id === project.id)) throw fail('FORBIDDEN', 'Cluster ini belum ditugaskan kepada Anda.')
    return process
  }
  async function create(actor, fields, files) {
    const data = parse(fieldsSchema, fields) // strict: rejects user_id, status and verification fields
    const mapping = await identity(actor)
    const process = await validateReferences(data, actor, mapping)
    if (actor.role !== 'SUPERADMIN' && ![jakartaDate(clock()), jakartaDate(new Date(clock().getTime() - 86400000))].includes(data.tanggal_kegiatan)) {
      throw fail('VALIDATION', 'Tanggal kegiatan hanya boleh hari ini atau kemarin.')
    }
    if (!files?.length || files.length > 5) throw fail('VALIDATION', 'Unggah 1 sampai 5 lampiran.')
    if (process.allow_file === false) throw fail('VALIDATION', 'Pekerjaan ini tidak menerima berkas. Mode teks/link belum tersedia.')
    const checked = []
    for (const file of files) {
      if (!file.buffer?.length || file.buffer.length > 10000000) throw fail('VALIDATION', 'Setiap lampiran maksimal 10 MB.')
      const type = await fileTypeFromBuffer(file.buffer)
      if (!formats.has(type?.mime)) throw fail('VALIDATION', 'Lampiran development mendukung JPG, PNG, WEBP, atau PDF.')
      checked.push({ ...file, mimetype: type.mime, size: file.buffer.length, originalname: String(file.originalname || 'lampiran').replace(/[\\/\x00-\x1f]/g, '_').slice(0, 200) })
    }
    let report
    try {
      report = row(await client.createReport({ ...data, user_id: mapping.externalUserId, status: 'PENDING', verified_by: null, verified_at: null }))
    } catch {
      throw fail('WRITE_UNCONFIRMED', 'Pengiriman laporan belum terkonfirmasi. Muat ulang daftar laporan dan periksa FTTH sebelum mencoba lagi agar tidak membuat duplikat.')
    }
    const warnings = []
    for (const file of checked) {
      const path = `ftth-laporan/${report.id}/${randomUUID()}.${formats.get(file.mimetype)}`
      try {
        await repository.prepareUpload({ reportId: report.id, storagePath: path, originalName: file.originalname, mimeType: file.mimetype, fileSize: file.size })
        const response = await client.uploadAttachment(file)
        const uploaded = response?.data ?? response
        if (!ftthFileUrl(uploaded?.file_url) || uploaded.mime_type !== file.mimetype || uploaded.file_size !== file.size) {
          throw fail('INTEGRATION_INVALID_RESPONSE', 'Respons upload FTTH tidak sesuai berkas yang dikirim.')
        }
        await repository.recordRemoteUpload(path, uploaded.file_url)
        await client.createAttachment({ laporan_id: report.id, file_url: uploaded.file_url, original_name: file.originalname,
          mime_type: file.mimetype, file_size: file.size, tipe_berkas: file.mimetype.startsWith('image/') ? 'foto' : 'dokumen' })
        await repository.markUpload(path, 'SYNCED')
      } catch {
        // A timeout can mean that the remote write succeeded. Never auto-retry or delete evidence.
        warnings.push(`${file.originalname}: belum terkonfirmasi. Minta admin memeriksa jurnal lampiran; jangan mengirim ulang laporan.`)
      }
    }
    return { ...summary(report), warnings }
  }
  async function authorizedReport(actor, id) {
    parse(idSchema, id)
    const mapping = await identity(actor)
    const report = row(await client.getReport(id))
    if (report.id !== id) throw fail('INTEGRATION_INVALID_RESPONSE', 'ID laporan FTTH tidak sesuai.')
    if (actor.role !== 'SUPERADMIN' && report.user_id !== mapping.externalUserId) throw fail('NOT_FOUND', 'Laporan tidak ditemukan.')
    return { report, mapping }
  }
  async function list(actor, query) {
    const page = parse(pageSchema, query)
    const mapping = await identity(actor)
    const items = rows(await client.listReports({ ...page, ...(actor.role === 'SUPERADMIN' ? {} : { user_id: mapping.externalUserId }) }))
    // Defense in depth if the remote API ignores its user_id filter.
    return items.filter((item) => actor.role === 'SUPERADMIN' || item.user_id === mapping.externalUserId).map(summary)
  }
  async function listAdminReports(actor, query = {}) {
    admin(actor)
    await identity(actor)
    const page = Math.max(1, Math.floor(Number(query.page) || 1))
    const limit = Math.min(100, Math.max(1, Math.floor(Number(query.limit) || 20)))
    const keyword = String(query.search || '').trim().toLocaleLowerCase('id')
    if (keyword.length > 200) throw fail('VALIDATION', 'Pencarian maksimal 200 karakter.')
    // API has no documented cross-relation name search. Scan bounded pages,
    // filter names before pagination, and fail instead of returning partial totals.
    const reports = [], seen = new Set()
    for (let offset = 0; ; offset += 100) {
      if (offset >= 10000) throw fail('INTEGRATION_INVALID_RESPONSE', 'Batas pencarian 10.000 laporan tercapai; diperlukan pencarian server FTTH.')
      const batch = rows(await client.listReports({ limit: 100, offset }))
      for (const item of batch) {
        if (seen.has(item.id)) throw fail('INTEGRATION_INVALID_RESPONSE', 'Pagination laporan FTTH mengembalikan ID berulang.')
        seen.add(item.id)
        const data = summary(item)
        const names = [item.user?.full_name || item.user?.name || item.user?.nama,
          item.project?.name || item.project?.project_name,
          item.cluster?.name || item.cluster?.cluster_name,
          (item.masterProcess || item.process)?.name || (item.masterProcess || item.process)?.nama]
        if (!keyword || names
          .some((name) => String(name || '').toLocaleLowerCase('id').includes(keyword))) reports.push(data)
      }
      if (batch.length < 100) break
    }
    reports.sort((a, b) => String(b.created_at || b.tanggal_kegiatan || '').localeCompare(String(a.created_at || a.tanggal_kegiatan || '')) || a.id.localeCompare(b.id))
    return { source: 'ftth', page, limit, total: reports.length, items: reports.slice((page - 1) * limit, page * limit).map((item) => ({
      ...item, tanggalKegiatan: item.tanggal_kegiatan, diterima: item.status === 'APPROVED',
      user: { nama: item.user_name }, cluster: { clusterName: item.cluster_name, desa: { namaDesa: item.project_name } },
      pekerjaan: { namaPekerjaan: item.process_name },
    })) }
  }
  async function detail(actor, id) {
    const { report } = await authorizedReport(actor, id)
    const attachments = rows(await client.listAttachments(id)).filter((item) => item.laporan_id === id)
    const dokumentasi = await Promise.all(attachments.map(async (item) => {
      const safePath = new RegExp(`^ftth-laporan/${id}/[0-9a-f-]+\\.(jpg|png|webp|pdf)$`).test(item.file_url)
      return { id: item.id, original_name: item.original_name, mime_type: item.mime_type,
        fileUrl: ftthFileUrl(item.file_url),
        downloadUrl: `/api/ftth/reports/${encodeURIComponent(id)}/attachments/${encodeURIComponent(item.id)}/download`,
        signedUrl: safePath && storage?.createSignedUrl ? await storage.createSignedUrl(item.file_url, 600) : null }
    }))
    return { ...summary(report), dokumentasi }
  }
  async function documentation(actor, query = {}) {
    admin(actor)
    await identity(actor)
    for (const key of ['projectId', 'clusterId', 'pekerjaanId']) if (query[key]) parse(idSchema, query[key])
    const reports = await all(client.listReports)
    const seen = new Set(), projects = new Map(), clusters = new Map(), processes = new Map(), items = []
    for (const report of reports) {
      if (seen.has(report.id)) throw fail('INTEGRATION_INVALID_RESPONSE', 'Pagination laporan FTTH mengembalikan ID berulang.')
      seen.add(report.id)
      const data = summary(report)
      projects.set(report.project_id, { id: report.project_id, name: data.project_name })
      clusters.set(report.cluster_id, { id: report.cluster_id, name: data.cluster_name, projectId: report.project_id })
      processes.set(report.process_id, { id: report.process_id, name: data.process_name })
      if ((query.projectId && report.project_id !== query.projectId) ||
          (query.clusterId && report.cluster_id !== query.clusterId) ||
          (query.pekerjaanId && report.process_id !== query.pekerjaanId)) continue
      if (!Array.isArray(report.dokumentasi)) throw fail('INTEGRATION_INVALID_RESPONSE', 'Relasi dokumentasi tidak tersedia pada respons laporan FTTH.')
      for (const file of rows(report.dokumentasi)) {
        if (file.laporan_id !== report.id) throw fail('INTEGRATION_INVALID_RESPONSE', 'Relasi lampiran FTTH tidak sesuai laporan.')
        items.push({ id: file.id, reportId: report.id, projectId: report.project_id, clusterId: report.cluster_id, processId: report.process_id,
          projectName: data.project_name, clusterName: data.cluster_name, processName: data.process_name,
          originalName: file.original_name, mimeType: file.mime_type, tanggal: report.tanggal_kegiatan, keterangan: report.keterangan,
          downloadUrl: `/api/ftth/reports/${encodeURIComponent(report.id)}/attachments/${encodeURIComponent(file.id)}/download` })
      }
    }
    return { source: 'ftth', items, total: items.length, options: { projects: [...projects.values()], clusters: [...clusters.values()], processes: [...processes.values()] } }
  }
  async function dashboard(actor) {
    admin(actor)
    await identity(actor)
    const [reports, users, projects, processes] = await Promise.all([
      all(client.listReports), all(client.listUsers), all(client.listProjects), client.listProcesses().then(rows),
    ])
    if (new Set(reports.map((r) => r.id)).size !== reports.length) throw fail('INTEGRATION_INVALID_RESPONSE', 'Pagination laporan FTTH mengembalikan ID berulang.')
    const byProject = new Map(projects.map((p) => [p.id, { id: p.id, namaDesa: label(p), jumlah: 0 }]))
    const byProcess = new Map(processes.map((p) => [p.id, { id: p.id, namaPekerjaan: label(p), jumlah: 0 }]))
    for (const item of reports) {
      const data = summary(item)
      if (!byProject.has(item.project_id)) byProject.set(item.project_id, { id: item.project_id, namaDesa: data.project_name, jumlah: 0 })
      if (!byProcess.has(item.process_id)) byProcess.set(item.process_id, { id: item.process_id, namaPekerjaan: data.process_name, jumlah: 0 })
      byProject.get(item.project_id).jumlah++
      byProcess.get(item.process_id).jumlah++
    }
    const targetDate = jakartaDate(clock())
    const activeUsers = users.filter(active)
    const complete = activeUsers.every((user) => typeof user.wajib_lapor === 'boolean')
    const required = activeUsers.filter((user) => user.wajib_lapor === true)
    const statuses = []
    if (complete) for (let index = 0; index < required.length; index += 5) {
      statuses.push(...await Promise.all(required.slice(index, index + 5).map((user) => dailyStatus(user.id))))
    }
    const count = statuses.filter((item) => item.clusters.length > 0 && item.clusters.every((cluster) => cluster.sudah_lapor)).length
    const clusterStatuses = statuses.flatMap((item) => item.clusters)
    const latest = [...reports].sort((a, b) => String(b.created_at || b.tanggal_kegiatan).localeCompare(String(a.created_at || a.tanggal_kegiatan)) || a.id.localeCompare(b.id)).slice(0, 10)
    return { source: 'ftth', targetDate, tanggal: null, jumlahLaporan: reports.length,
      wajibLapor: complete ? required.length : null, sudahMelapor: complete ? count : null, belumMelapor: complete ? required.length - count : null,
      complianceAvailable: complete,
      kepatuhanCluster: complete ? { total: clusterStatuses.length, sudah: clusterStatuses.filter((item) => item.sudah_lapor).length,
        belum: clusterStatuses.filter((item) => !item.sudah_lapor).length, tanpaPenugasan: statuses.filter((item) => !item.clusters.length).length } : null,
      distribusiDesa: [...byProject.values()], distribusiPekerjaan: [...byProcess.values()],
      terbaru: latest.map((item) => { const data = summary(item); return { id: data.id, keterangan: data.keterangan,
        user: { nama: data.user_name }, cluster: { desa: { namaDesa: data.project_name }, clusterName: data.cluster_name }, pekerjaan: { namaPekerjaan: data.process_name } } }),
    }
  }
  async function download(actor, reportId, attachmentId, { forceDownload = false } = {}) {
    const { report } = await authorizedReport(actor, reportId)
    const attachment = rows(await client.listAttachments(report.id)).find((item) => item.id === attachmentId && item.laporan_id === report.id)
    if (!attachment) throw fail('NOT_FOUND', 'Lampiran tidak ditemukan.')
    const response = await client.downloadAttachment(attachment.id, { forceDownload })
    const mimeType = String(attachment.mime_type || response.headers?.get?.('content-type') || 'application/octet-stream').split(';')[0]
    if (mimeType === 'text/html') throw fail('INTEGRATION_INVALID_RESPONSE', 'Server FTTH mengembalikan halaman HTML, bukan berkas lampiran.')
    const buffer = Buffer.from(await response.arrayBuffer())
    if (!buffer.length) throw fail('INTEGRATION_INVALID_RESPONSE', 'Berkas lampiran dari FTTH kosong.')
    const filename = String(attachment.original_name || `lampiran-${attachment.id}`).replace(/[\\/\x00-\x1f]/g, '_').slice(0, 200)
    return { buffer, mimeType, filename, forceDownload }
  }
  async function profilePhoto(actor, externalUserId, { forceDownload = false } = {}) {
    const mapping = await identity(actor)
    parse(idSchema, externalUserId)
    if (actor.role !== 'SUPERADMIN' && mapping.externalUserId !== externalUserId) throw fail('NOT_FOUND', 'Foto profil tidak ditemukan.')
    const response = await client.getUserPhoto(externalUserId, { forceDownload })
    const mimeType = String(response.headers?.get?.('content-type') || 'image/jpeg').split(';')[0]
    if (!mimeType.startsWith('image/')) throw fail('INTEGRATION_INVALID_RESPONSE', 'Server FTTH mengembalikan tipe foto profil yang tidak valid.')
    const buffer = Buffer.from(await response.arrayBuffer())
    if (!buffer.length) throw fail('INTEGRATION_INVALID_RESPONSE', 'Foto profil dari FTTH kosong.')
    return { buffer, mimeType, filename: `foto-profil-${externalUserId}.jpg`, forceDownload }
  }
  async function uploadProfilePhoto(actor, externalUserId, file) {
    admin(actor)
    parse(idSchema, externalUserId)
    if (!file?.buffer?.length || file.size > 5_000_000) throw fail('VALIDATION', 'Foto profil maksimal 5 MB.')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) throw fail('VALIDATION', 'Foto profil harus JPG, PNG, atau WEBP.')
    const response = await client.uploadUserPhoto(externalUserId, file)
    const result = response?.data ?? response
    if (!result || typeof result.foto !== 'string') throw fail('INTEGRATION_INVALID_RESPONSE', 'Respons foto profil FTTH tidak sesuai kontrak.')
    return result
  }
  async function update(actor, id, fields) {
    admin(actor) // employees fill reports only, no edits/deletes in the temporary FTTH mode
    const data = parse(fieldsSchema, fields)
    const { report, mapping } = await authorizedReport(actor, id)
    if (report.status === 'APPROVED') throw fail('LOCKED', 'Buka kembali laporan sebelum mengoreksi.')
    await validateReferences(data, actor, mapping)
    return summary(row(await client.updateReport(id, data)))
  }
  async function setStatus(actor, id, input) {
    admin(actor)
    const data = parse(statusSchema, input)
    const { mapping } = await authorizedReport(actor, id)
    return summary(row(await client.updateReport(id, { ...data,
      verified_by: data.status === 'PENDING' ? null : mapping.externalUserId,
      verified_at: data.status === 'PENDING' ? null : clock().toISOString(),
    })))
  }
  async function remove(actor, id) {
    admin(actor)
    await authorizedReport(actor, id)
    await client.deleteReport(id)
    // Keep private files for recovery; deletion of metadata is not deletion of binary evidence.
    return { message: 'Laporan dan metadata dihapus. Penghapusan berkas fisik FTTH mengikuti kebijakan server; berkas lokal lama tidak diubah.' }
  }
  async function assignedClusters(userId) {
    const clusters = await all((query) => client.listUserClusters(userId, query))
    if (clusters.some((item) => !idSchema.safeParse(item.project_id).success || (item.pic_id != null && item.pic_id !== userId))) {
      throw fail('INTEGRATION_INVALID_RESPONSE', 'Penugasan cluster FTTH tidak sesuai akun atau project.')
    }
    return clusters.filter(active).map((item) => ({ id: item.id, name: label(item), project_id: item.project_id }))
  }
  async function authorizeUser(actor, userId) {
    parse(idSchema, userId)
    const mapping = await identity(actor)
    if (actor.role !== 'SUPERADMIN' && mapping.externalUserId !== userId) throw fail('FORBIDDEN', 'Akses akun lain tidak diizinkan.')
  }
  async function dailyStatus(userId) {
    const result = await client.getUserReportStatus(userId); const data = result?.data ?? result
    if (!data || data.user_id !== userId || !Array.isArray(data.clusters) || data.wajib_lapor !== true || data.tanggal !== jakartaDate(clock()) ||
        new Set(data.clusters.map((item) => item?.cluster_id)).size !== data.clusters.length ||
        data.clusters.some((item) => !item || !idSchema.safeParse(item.cluster_id).success || typeof item.sudah_lapor !== 'boolean' ||
          (item.laporan_id != null && !idSchema.safeParse(item.laporan_id).success) ||
          (item.laporan_status != null && !['PENDING', 'APPROVED', 'REJECTED'].includes(item.laporan_status)))) throw fail('INTEGRATION_INVALID_RESPONSE', 'Status laporan FTTH tidak sesuai kontrak atau tanggal WIB hari ini.')
    return { user_id: userId, wajib_lapor: true, tanggal: data.tanggal, clusters: data.clusters.map((item) => ({
      cluster_id: item.cluster_id, cluster_name: item.cluster_name, project_name: item.project_name,
      sudah_lapor: item.sudah_lapor, laporan_id: item.laporan_id, laporan_status: item.laporan_status,
    })) }
  }
  async function userClusters(actor, userId) {
    await authorizeUser(actor, userId)
    return assignedClusters(userId)
  }
  async function userReportStatus(actor, userId) {
    await authorizeUser(actor, userId)
    const user = row(await client.getUser(userId))
    if (user.id !== userId || typeof user.wajib_lapor !== 'boolean') throw fail('INTEGRATION_INVALID_RESPONSE', 'Data wajib lapor FTTH belum tersedia.')
    if (!user.wajib_lapor) return { user_id: userId, wajib_lapor: false, tanggal: jakartaDate(clock()), clusters: [] }
    return dailyStatus(userId)
  }
  return { references, mappings, saveMapping, create, list, listAdminReports, documentation, dashboard, detail, update, setStatus, remove, download, profilePhoto, uploadProfilePhoto, userClusters, userReportStatus }
}
