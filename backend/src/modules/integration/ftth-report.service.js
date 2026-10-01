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
  const desc = item.kendala_lapangan ?? item.keterangan ?? ''
  return {
    id: item.id, user_id: item.user_id, project_id: item.project_id, cluster_id: item.cluster_id,
    process_id: item.process_id, tanggal_kegiatan: item.tanggal_kegiatan,
    keterangan: desc,
    kendala_lapangan: desc,
    nomor_perangkat: item.nomor_perangkat,
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
    let user
    try {
      user = row(await client.getUser(mapping.externalUserId))
    } catch {
      const users = await (client.listUsers ? client.listUsers().then(rows).catch(() => []) : [])
      user = users.find((u) => u.id === mapping.externalUserId)
    }
    if (!user || user.id !== mapping.externalUserId || !active(user)) throw fail('FORBIDDEN', 'Akun FTTH tidak aktif atau tidak cocok.')
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
    const [projects, clusters, categories, processes, clusterProcesses, userReports] = await Promise.all([
      all(client.listProjects),
      mapping ? assignedClusters(mapping.externalUserId) : all(client.listClusters),
      client.listCategories().then(rows),
      client.listProcesses().then(rows),
      client.listClusterProcesses ? client.listClusterProcesses().then(rows).catch(() => []) : Promise.resolve([]),
      mapping ? all((query) => client.listReports({ ...query, user_id: mapping.externalUserId })) : Promise.resolve([]),
    ])
    const visibleClusters = clusters.filter(active)

    if (mapping) {
      // Find cluster processes assigned to this user as PIC
      const userAssignedCP = clusterProcesses.filter((cp) => cp.pic_id === mapping.externalUserId && active(cp))

      // Determine which jobs are completed (either status in cp is completed/selesai, or user submitted a SELESAI report)
      const completedJobKeys = new Set()
      userAssignedCP.forEach((cp) => {
        if (cp.status === 'completed' || cp.status === 'selesai') {
          completedJobKeys.add(`${cp.cluster_id}:${cp.master_process_id}`)
        }
      })
      userReports.forEach((rep) => {
        if (rep.status === 'SELESAI' || rep.status === 'completed' || rep.status === 'APPROVED') {
          completedJobKeys.add(`${rep.cluster_id}:${rep.process_id}`)
        }
      })

      // Active assigned jobs: assigned to this user AND not completed yet
      const activeAssignments = userAssignedCP.filter(
        (cp) => !completedJobKeys.has(`${cp.cluster_id}:${cp.master_process_id}`)
      )

      // Only clusters that have assigned jobs or assigned to user
      const assignedClusterIds = new Set(userAssignedCP.map((cp) => cp.cluster_id))
      visibleClusters.forEach((c) => assignedClusterIds.add(c.id))
      const userClusters = visibleClusters.filter((c) => assignedClusterIds.has(c.id))

      // Only processes that are assigned to this employee and not completed
      const activeProcessIds = new Set(activeAssignments.map((cp) => cp.master_process_id))
      const userProcesses = processes
        .filter((item) => active(item) && (activeProcessIds.size === 0 || activeProcessIds.has(item.id)))
        .map((item) => {
          const forClusters = activeAssignments
            .filter((cp) => cp.master_process_id === item.id)
            .map((cp) => cp.cluster_id)
          return {
            id: item.id,
            name: label(item),
            master_category_id: item.master_category_id,
            allow_file: item.allow_file,
            input_instruction: item.input_instruction,
            cluster_ids: forClusters,
          }
        })

      const userCategoryIds = new Set(userProcesses.map((p) => p.master_category_id))
      const userCategories = categories.filter((cat) => active(cat) && userCategoryIds.has(cat.id))
      const userProjectIds = new Set(userClusters.map((c) => c.project_id))
      const userProjects = projects.filter((p) => active(p) && userProjectIds.has(p.id))

      return {
        projects: userProjects.map((item) => ({ id: item.id, name: label(item) })),
        clusters: userClusters.map((item) => ({ id: item.id, name: label(item), project_id: item.project_id })),
        categories: userCategories.map((item) => ({ id: item.id, name: label(item) })),
        processes: userProcesses,
        assignedJobs: activeAssignments.map((cp) => ({
          id: cp.id,
          cluster_id: cp.cluster_id,
          process_id: cp.master_process_id,
          status: cp.status,
        })),
      }
    }

    return {
      projects: projects.filter((item) => active(item) && visibleClusters.some((c) => c.project_id === item.id)).map((item) => ({ id: item.id, name: label(item) })),
      clusters: visibleClusters.map((item) => ({ id: item.id, name: label(item), project_id: item.project_id })),
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
    if (actor.role !== 'SUPERADMIN') {
      const assigned = await assignedClusters(mapping.externalUserId)
      const clusterProcesses = client.listClusterProcesses ? await client.listClusterProcesses().then(rows).catch(() => []) : []
      const userAssignedCP = clusterProcesses.filter((cp) => cp.pic_id === mapping.externalUserId && active(cp))

      const hasJobAssignment = userAssignedCP.some((cp) => cp.cluster_id === cluster.id && cp.master_process_id === process.id)
      const hasClusterAssignment = assigned.some((item) => item.id === cluster.id && item.project_id === project.id)

      if (userAssignedCP.length > 0 && !hasJobAssignment) {
        throw fail('FORBIDDEN', 'Pekerjaan ini tidak di-assign kepada Anda.')
      }
      if (!hasClusterAssignment && !hasJobAssignment) {
        throw fail('FORBIDDEN', 'Cluster ini belum ditugaskan kepada Anda.')
      }
    }
    return process
  }
  async function create(actor, fields, files) {
    const data = parse(fieldsSchema, fields)
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
      const payload = {
        user_id: mapping.externalUserId,
        project_id: data.project_id,
        cluster_id: data.cluster_id,
        process_id: data.process_id,
        tanggal_kegiatan: data.tanggal_kegiatan,
        nomor_perangkat: data.nomor_perangkat || null,
        status: data.status || 'ON_PROGRESS',
        kendala_lapangan: data.status === 'KENDALA' ? (data.kendala_lapangan || data.keterangan || null) : (data.kendala_lapangan || data.keterangan || null),
        verified_by: null,
        verified_at: null,
      }
      report = row(await client.createReport(payload))
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
    const statusFilter = query.status ? String(query.status).trim() : null
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
        if (statusFilter && statusFilter !== 'ALL' && data.status !== statusFilter) continue
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
    for (const key of ['projectId', 'clusterId', 'kategoriId', 'pekerjaanId']) if (query[key]) parse(idSchema, query[key])
    const [reports, rawProjects, rawClusters, rawCategories, rawProcesses] = await Promise.all([
      all(client.listReports),
      all(client.listProjects),
      all(client.listClusters),
      client.listCategories().then(rows),
      client.listProcesses().then(rows),
    ])
    const categoryMap = new Map(rawCategories.map((c) => [c.id, { id: c.id, name: label(c) }]))
    const processMap = new Map(rawProcesses.map((p) => [p.id, {
      id: p.id,
      name: label(p),
      categoryId: p.master_category_id || p.category_id || null,
      categoryName: categoryMap.get(p.master_category_id || p.category_id)?.name || 'Belum dikategorikan',
    }]))
    const projects = new Map()
    for (const p of rawProjects) {
      if (active(p)) projects.set(p.id, { id: p.id, name: label(p) })
    }
    const clusters = new Map()
    for (const c of rawClusters) {
      if (active(c)) clusters.set(c.id, { id: c.id, name: label(c), projectId: c.project_id })
    }
    const categories = new Map()
    for (const c of rawCategories) {
      if (active(c)) categories.set(c.id, { id: c.id, name: label(c) })
    }
    const processes = new Map()
    for (const p of rawProcesses) {
      if (active(p)) {
        const catId = p.master_category_id || p.category_id || null
        processes.set(p.id, {
          id: p.id,
          name: label(p),
          categoryId: catId,
          categoryName: categoryMap.get(catId)?.name || 'Belum dikategorikan',
        })
      }
    }
    const seen = new Set(), items = []
    for (const report of reports) {
      if (seen.has(report.id)) throw fail('INTEGRATION_INVALID_RESPONSE', 'Pagination laporan FTTH mengembalikan ID berulang.')
      seen.add(report.id)
      const data = summary(report)
      const procInfo = processMap.get(report.process_id)
      const catId = procInfo?.categoryId || null
      const catName = procInfo?.categoryName || 'Belum dikategorikan'
      if (!projects.has(report.project_id)) {
        projects.set(report.project_id, { id: report.project_id, name: data.project_name })
      }
      if (!clusters.has(report.cluster_id)) {
        clusters.set(report.cluster_id, { id: report.cluster_id, name: data.cluster_name, projectId: report.project_id })
      }
      if (catId && !categories.has(catId)) {
        categories.set(catId, { id: catId, name: catName })
      }
      if (!processes.has(report.process_id)) {
        processes.set(report.process_id, { id: report.process_id, name: data.process_name, categoryId: catId, categoryName: catName })
      }
      if ((query.projectId && report.project_id !== query.projectId) ||
          (query.clusterId && report.cluster_id !== query.clusterId) ||
          (query.kategoriId && catId !== query.kategoriId) ||
          (query.pekerjaanId && report.process_id !== query.pekerjaanId)) continue
      if (!Array.isArray(report.dokumentasi)) throw fail('INTEGRATION_INVALID_RESPONSE', 'Relasi dokumentasi tidak tersedia pada respons laporan FTTH.')
      for (const file of rows(report.dokumentasi)) {
        if (file.laporan_id !== report.id) throw fail('INTEGRATION_INVALID_RESPONSE', 'Relasi lampiran FTTH tidak sesuai laporan.')
        items.push({ id: file.id, reportId: report.id, projectId: report.project_id, clusterId: report.cluster_id,
          processId: report.process_id, categoryId: catId, categoryName: catName,
          projectName: data.project_name, clusterName: data.cluster_name, processName: data.process_name,
          originalName: file.original_name, mimeType: file.mime_type, tanggal: report.tanggal_kegiatan, keterangan: report.keterangan,
          downloadUrl: `/api/ftth/reports/${encodeURIComponent(report.id)}/attachments/${encodeURIComponent(file.id)}/download` })
      }
    }
    return {
      source: 'ftth',
      items,
      total: items.length,
      options: {
        projects: [...projects.values()],
        clusters: [...clusters.values()],
        categories: [...categories.values()],
        processes: [...processes.values()],
      },
    }
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
    const reportStats = {
      onProgress: reports.filter((r) => r.status === 'ON_PROGRESS' || r.status === 'PENDING').length,
      selesai: reports.filter((r) => r.status === 'SELESAI' || r.status === 'APPROVED').length,
      kendala: reports.filter((r) => r.status === 'KENDALA' || r.status === 'REJECTED').length,
      total: reports.length,
    }
    return { source: 'ftth', targetDate, tanggal: null, jumlahLaporan: reports.length,
      reportStats,
      wajibLapor: complete ? required.length : null, sudahMelapor: complete ? count : null, belumMelapor: complete ? required.length - count : null,
      complianceAvailable: complete,
      kepatuhanCluster: complete ? { total: clusterStatuses.length, sudah: clusterStatuses.filter((item) => item.sudah_lapor).length,
        belum: clusterStatuses.filter((item) => !item.sudah_lapor).length, tanpaPenugasan: statuses.filter((item) => !item.clusters.length).length } : null,
      distribusiDesa: [...byProject.values()], distribusiPekerjaan: [...byProcess.values()],
      terbaru: latest.map((item) => { const data = summary(item); return { id: data.id, keterangan: data.keterangan, kendala_lapangan: data.kendala_lapangan, status: data.status,
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
  async function employeeDashboard(actor) {
    await identity(actor)
    const [projects, clusters, processes, clusterProcesses, reports] = await Promise.all([
      all(client.listProjects),
      all(client.listClusters),
      client.listProcesses().then(rows),
      client.listClusterProcesses().then(rows),
      all(client.listReports),
    ])

    const activeProjects = projects.filter(active)
    const activeClusters = clusters.filter(active)
    const activeCP = clusterProcesses.filter(active)

    const totalProjects = activeProjects.length
    const totalClusters = activeClusters.length
    const homepassTarget = activeClusters.reduce((sum, c) => sum + (Number(c.homepass_target) || 0), 0)
    const homepassAchieved = activeClusters.reduce((sum, c) => sum + (Number(c.homepass_achieved) || 0), 0)

    // Calculate overall progress from cluster processes
    const completedCP = activeCP.filter((cp) => cp.status === 'completed' || cp.status === 'selesai').length
    const overallProgress = activeCP.length > 0 ? Math.round((completedCP / activeCP.length) * 100) : 0

    // Process progress breakdown
    const processProgress = processes.filter(active).map((p) => {
      const items = activeCP.filter((cp) => cp.master_process_id === p.id)
      const total = items.length
      const done = items.filter((cp) => cp.status === 'completed' || cp.status === 'selesai').length
      return {
        id: p.id,
        name: label(p),
        total,
        completed: done,
        percentage: total > 0 ? Math.round((done / total) * 100) : 0,
      }
    }).filter((p) => p.total > 0)

    // Clusters with location for map
    const projectMap = new Map(projects.map((p) => [p.id, p]))
    const mapClusters = activeClusters.map((c) => ({
      id: c.id,
      name: label(c),
      project_id: c.project_id,
      project_name: projectMap.get(c.project_id) ? label(projectMap.get(c.project_id)) : c.project_id,
      status: c.status || 'open',
      latitude: Number(c.latitude) || null,
      longitude: Number(c.longitude) || null,
      homepass_target: Number(c.homepass_target) || 0,
      homepass_achieved: Number(c.homepass_achieved) || 0,
    }))

    // Report stats for this employee
    const userReports = reports.filter((r) => r.user_id === actor.externalUserId || r.user_id === actor.id)
    const reportStats = {
      onProgress: userReports.filter((r) => r.status === 'ON_PROGRESS' || r.status === 'PENDING').length,
      selesai: userReports.filter((r) => r.status === 'SELESAI' || r.status === 'APPROVED').length,
      kendala: userReports.filter((r) => r.status === 'KENDALA' || r.status === 'REJECTED').length,
      total: userReports.length,
    }

    return {
      totalProjects,
      totalClusters,
      homepassTarget,
      homepassAchieved,
      overallProgress,
      clusters: mapClusters,
      processProgress,
      reportStats,
    }
  }

  async function listProjects(actor) {
    await identity(actor)
    const [projects, clusters] = await Promise.all([
      all(client.listProjects),
      all(client.listClusters),
    ])
    const activeProjects = projects.filter(active)
    const activeClusters = clusters.filter(active)

    return activeProjects.map((p) => {
      const pClusters = activeClusters.filter((c) => c.project_id === p.id)
      const target = pClusters.reduce((sum, c) => sum + (Number(c.homepass_target) || 0), 0)
      const achieved = pClusters.reduce((sum, c) => sum + (Number(c.homepass_achieved) || 0), 0)
      return {
        id: p.id,
        name: label(p),
        spk_number: p.spk_number || '-',
        spk_date: p.spk_date || '-',
        estimated_homepass: Number(p.estimated_homepass) || target,
        homepass_target: target,
        homepass_achieved: achieved,
        status: p.status || 'open',
        cluster_count: pClusters.length,
      }
    })
  }

  async function projectDetail(actor, id) {
    await identity(actor)
    parse(idSchema, id)
    const [project, clusters] = await Promise.all([
      client.getProject(id).then(row),
      all(client.listClusters),
    ])
    const pClusters = clusters.filter(active).filter((c) => c.project_id === id)
    return {
      ...project,
      clusters: pClusters.map((c) => ({
        id: c.id,
        name: label(c),
        status: c.status,
        homepass_target: c.homepass_target,
        homepass_achieved: c.homepass_achieved,
        latitude: c.latitude,
        longitude: c.longitude,
      })),
    }
  }

  async function listClusters(actor) {
    await identity(actor)
    const [clusters, projects, users, clusterProcesses, processes, categories] = await Promise.all([
      all(client.listClusters),
      all(client.listProjects),
      all(client.listUsers),
      all(client.listClusterProcesses),
      all(client.listProcesses),
      all(client.listCategories),
    ])
    const projectMap = new Map(projects.map((p) => [p.id, p]))
    const userMap = new Map(users.map((u) => [u.id, u]))
    const processMap = new Map(processes.map((p) => [p.id, p]))
    const activeCP = clusterProcesses.filter(active)

    return clusters.filter(active).map((c) => {
      const cpForCluster = activeCP.filter((cp) => cp.cluster_id === c.id)
      const totalCP = cpForCluster.length
      const completedCP = cpForCluster.filter((cp) => cp.status === 'completed' || cp.status === 'selesai').length
      const overallProgress = totalCP > 0 ? Math.round((completedCP / totalCP) * 100) : 0

      // Categorize into SITAC, IMPLEMENTASI, IKR
      const categoriesSummary = categories.filter(active).map((cat) => {
        const catProcesses = cpForCluster.filter((cp) => {
          const proc = processMap.get(cp.master_process_id)
          return proc && proc.master_category_id === cat.id
        })
        const total = catProcesses.length
        const done = catProcesses.filter((cp) => cp.status === 'completed' || cp.status === 'selesai').length
        const percentage = total > 0 ? Math.round((done / total) * 100) : 0

        const items = catProcesses.map((cp) => {
          const proc = processMap.get(cp.master_process_id)
          return {
            id: cp.id,
            process_id: cp.master_process_id,
            name: proc ? label(proc) : cp.master_process_id,
            status: cp.status || 'pending',
            date: cp.completed_date || cp.target_date || null,
          }
        })

        return {
          id: cat.id,
          name: label(cat),
          total,
          completed: done,
          percentage,
          items,
        }
      }).filter((cat) => cat.total > 0 || cat.items.length > 0)

      return {
        id: c.id,
        name: label(c),
        description: c.description || (projectMap.get(c.project_id) ? label(projectMap.get(c.project_id)) : ''),
        project_id: c.project_id,
        project_name: projectMap.get(c.project_id) ? label(projectMap.get(c.project_id)) : c.project_id,
        status: c.status || 'open',
        homepass_target: Number(c.homepass_target) || 0,
        homepass_achieved: Number(c.homepass_achieved) || 0,
        latitude: Number(c.latitude) || null,
        longitude: Number(c.longitude) || null,
        pic_id: c.pic_id,
        pic_name: userMap.get(c.pic_id) ? label(userMap.get(c.pic_id)) : '-',
        overall_progress: overallProgress,
        categories_summary: categoriesSummary,
      }
    })
  }

  async function clusterDetail(actor, id) {
    await identity(actor)
    parse(idSchema, id)
    const [cluster, clusterProcesses, processes, categories, users, projects, reports] = await Promise.all([
      client.getCluster(id).then(row),
      all(client.listClusterProcesses),
      all(client.listProcesses),
      all(client.listCategories),
      all(client.listUsers),
      all(client.listProjects),
      all(client.listReports),
    ])
    const processMap = new Map(processes.map((p) => [p.id, p]))
    const userMap = new Map(users.map((u) => [u.id, u]))
    const projectMap = new Map(projects.map((p) => [p.id, p]))
    const activeCP = clusterProcesses.filter(active)
    const cpForCluster = activeCP.filter((cp) => cp.cluster_id === id)
    const totalCP = cpForCluster.length
    const completedCP = cpForCluster.filter((cp) => cp.status === 'completed' || cp.status === 'selesai').length
    const overallProgress = totalCP > 0 ? Math.round((completedCP / totalCP) * 100) : 0

    const categoriesSummary = categories.filter(active).map((cat) => {
      const catProcesses = cpForCluster.filter((cp) => {
        const proc = processMap.get(cp.master_process_id)
        return proc && proc.master_category_id === cat.id
      })
      const total = catProcesses.length
      const done = catProcesses.filter((cp) => cp.status === 'completed' || cp.status === 'selesai').length
      const percentage = total > 0 ? Math.round((done / total) * 100) : 0

      const items = catProcesses.map((cp) => {
        const proc = processMap.get(cp.master_process_id)
        const itemReports = reports.filter((r) => r.cluster_id === id && r.process_id === cp.master_process_id)
        return {
          id: cp.id,
          process_id: cp.master_process_id,
          name: proc ? label(proc) : cp.master_process_id,
          input_instruction: proc?.input_instruction || '',
          allow_file: proc?.allow_file ?? true,
          status: cp.status || 'pending',
          target_date: cp.target_date,
          completed_date: cp.completed_date,
          pic_id: cp.pic_id,
          pic_name: userMap.get(cp.pic_id) ? label(userMap.get(cp.pic_id)) : '-',
          notes: cp.notes,
          reportCount: itemReports.length,
          latestReport: itemReports[0] ? summary(itemReports[0]) : null,
        }
      })

      return {
        id: cat.id,
        name: label(cat),
        total,
        completed: done,
        percentage,
        items,
      }
    }).filter((cat) => cat.total > 0 || cat.items.length > 0)

    return {
      ...cluster,
      name: label(cluster),
      description: cluster.description || (projectMap.get(cluster.project_id) ? label(projectMap.get(cluster.project_id)) : ''),
      project_name: projectMap.get(cluster.project_id) ? label(projectMap.get(cluster.project_id)) : cluster.project_id,
      overall_progress: overallProgress,
      categories_summary: categoriesSummary,
      homepass_target: Number(cluster.homepass_target) || 0,
      homepass_achieved: Number(cluster.homepass_achieved) || 0,
      latitude: Number(cluster.latitude) || null,
      longitude: Number(cluster.longitude) || null,
      processes: cpForCluster.map((cp) => ({
        id: cp.id,
        process_id: cp.master_process_id,
        process_name: processMap.get(cp.master_process_id) ? label(processMap.get(cp.master_process_id)) : cp.master_process_id,
        status: cp.status,
        target_date: cp.target_date,
        completed_date: cp.completed_date,
        pic_id: cp.pic_id,
        pic_name: userMap.get(cp.pic_id) ? label(userMap.get(cp.pic_id)) : '-',
        notes: cp.notes,
      })),
    }
  }

  return { references, mappings, saveMapping, create, list, listAdminReports, documentation, dashboard, detail, update, setStatus, remove, download, profilePhoto, uploadProfilePhoto, userClusters, userReportStatus, employeeDashboard, listProjects, projectDetail, listClusters, clusterDetail }
}
