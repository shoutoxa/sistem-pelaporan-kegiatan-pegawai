import { ftthApi } from '../../services/ftthApi.js'

function historyError(code, message) { const error = new Error(message); error.code = code; return error }

export function createHistoryService({ prisma, storage, clock = () => new Date(), ftthApi: injectedFtthApi }) {
  const ftth = injectedFtthApi || ftthApi
  if (prisma) {
    async function listOwnReports({ actor, page = 1, limit = 20, tanggal, pekerjaanId }) {
      const safePage = Math.max(1, Number(page) || 1)
      const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
      const where = { userId: actor.id }
      if (tanggal) where.tanggalKegiatan = new Date(`${tanggal}T00:00:00.000Z`)
      if (pekerjaanId) where.pekerjaanId = pekerjaanId
      const [items, total] = await Promise.all([
        prisma.laporan.findMany({ where, include: { cluster: { include: { desa: true } }, pekerjaan: true, dokumentasi: true }, orderBy: { createdAt: 'desc' }, skip: (safePage - 1) * safeLimit, take: safeLimit }),
        prisma.laporan.count({ where }),
      ])
      const now = clock().getTime()
      return {
        items: await Promise.all(items.map(async (item) => {
          const editableUntil = new Date(new Date(item.createdAt).getTime() + 24 * 60 * 60 * 1000)
          const dokumentasi = await Promise.all(
            (item.dokumentasi || []).map(async (doc) => ({
              ...doc,
              signedUrl: (await storage?.createSignedUrl?.(doc.storagePath, 600)) || `/api/files/${doc.storagePath}`,
            }))
          )
          return { ...item, dokumentasi, editableUntil: editableUntil.toISOString(), canEdit: !item.diterima && now <= editableUntil.getTime() }
        })),
        total,
        page: safePage,
        limit: safeLimit,
      }
    }

    async function getReportDetail({ actor, reportId }) {
      const where = actor.role === 'SUPERADMIN' ? { id: reportId } : { id: reportId, userId: actor.id }
      const report = await prisma.laporan.findFirst({ where, include: { user: true, cluster: { include: { desa: true } }, pekerjaan: true, dokumentasi: true } })
      if (!report || (actor.role !== 'SUPERADMIN' && report.userId !== actor.id)) throw historyError('NOT_FOUND', 'Laporan tidak ditemukan.')
      const dokumentasi = await Promise.all((report.dokumentasi || []).map(async (item) => ({ ...item, signedUrl: await storage?.createSignedUrl?.(item.storagePath, 600) || item.storagePath })))
      return { ...report, dokumentasi }
    }

    async function listAdminReports(filters = {}) {
      const { page = 1, limit = 20, from, to, pegawaiId, desaId, clusterId, pekerjaanId, search } = filters
      const safePage = Math.max(1, Number(page) || 1)
      const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
      const where = {}
      if (pegawaiId) where.userId = pegawaiId
      if (clusterId) where.clusterId = clusterId
      if (pekerjaanId) where.pekerjaanId = pekerjaanId
      if (desaId) where.cluster = { desaId }
      if (from || to) where.tanggalKegiatan = { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T00:00:00.000Z`) } : {}) }
      const keyword = typeof search === 'string' ? search.trim() : ''
      if (keyword) {
        where.OR = [
          { user: { nama: { contains: keyword, mode: 'insensitive' } } },
          { cluster: { clusterName: { contains: keyword, mode: 'insensitive' } } },
          { cluster: { desa: { namaDesa: { contains: keyword, mode: 'insensitive' } } } },
          { pekerjaan: { namaPekerjaan: { contains: keyword, mode: 'insensitive' } } },
        ]
      }
      const [items, total] = await Promise.all([
        prisma.laporan.findMany({ where, include: { user: true, cluster: { include: { desa: true } }, pekerjaan: true, dokumentasi: true }, orderBy: { createdAt: 'desc' }, skip: (safePage - 1) * safeLimit, take: safeLimit }),
        prisma.laporan.count({ where }),
      ])
      return { items, total, page: safePage, limit: safeLimit }
    }

    async function listDocumentation(filters = {}) {
      const { desaId, clusterId, pekerjaanId } = filters
      const where = { dokumentasi: { some: {} } }
      if (pekerjaanId) where.pekerjaanId = pekerjaanId
      if (clusterId) where.clusterId = clusterId
      else if (desaId) where.cluster = { desaId }
      const reports = await prisma.laporan.findMany({
        where,
        include: {
          cluster: { include: { desa: true } },
          pekerjaan: true,
          dokumentasi: true,
        },
      })
      const items = reports.flatMap((report) => (report.dokumentasi || []).map((doc) => {
        const cleanPath = String(doc.storagePath || '').replace(/^\/+/, '')
        return {
          ...doc,
          originalName: doc.originalName,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          storagePath: cleanPath,
          signedUrl: '/api/files/' + cleanPath,
          laporanId: report.id,
          tanggalKegiatan: report.tanggalKegiatan,
          project: report.cluster?.desa ? { id: report.cluster.desa.id, name: report.cluster.desa.namaDesa } : null,
          cluster: report.cluster ? { id: report.cluster.id, name: report.cluster.clusterName } : null,
          process: report.pekerjaan ? { id: report.pekerjaan.id, name: report.pekerjaan.namaPekerjaan, master_category_id: report.pekerjaan.kategoriId } : null,
          laporan: {
            id: report.id,
            tanggalKegiatan: report.tanggalKegiatan,
            cluster: report.cluster,
            pekerjaan: report.pekerjaan,
          },
        }
      }))
      return items
    }

    return { listOwnReports, getReportDetail, listAdminReports, listDocumentation }
  }

  async function listOwnReports({ actor, page = 1, limit = 20, tanggal, processId }) {
    const safePage = Math.max(1, Number(page) || 1)
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
    const filters = {
      user_id: actor.id,
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
    }
    if (tanggal) filters.tanggal_kegiatan = tanggal
    if (processId) filters.process_id = processId

    const response = await ftth.getReports(filters)
    const items = response.data || response || []
    const total = response.total || items.length || 0

    const now = clock().getTime()
    return {
      items: items.map((item) => {
        const createdAtTime = new Date(item.created_at || item.createdAt || now).getTime()
        const validCreatedAt = isNaN(createdAtTime) ? now : createdAtTime
        const editableUntil = new Date(validCreatedAt + 24 * 60 * 60 * 1000)
        const rawDocs = (item.dokumentasi || item.dokumentasi_laporan || []).filter(
          (d) => !d.laporan_id || d.laporan_id === item.id
        )
        const dokumentasi = rawDocs.map((doc) => {
          let signedUrl = doc.file_url || doc.storagePath
          if (doc.file_url && doc.file_url.startsWith('/uploads/')) {
            signedUrl = 'https://ftth.digitak.id' + doc.file_url
          } else if (signedUrl && !signedUrl.startsWith('http')) {
            signedUrl = '/api/files/' + signedUrl.replace(/^\/+/, '')
          }
          return { ...doc, signedUrl }
        })
        return {
          ...item,
          dokumentasi,
          editableUntil: editableUntil.toISOString(),
          canEdit: item.status !== 'APPROVED' && now <= editableUntil.getTime(),
        }
      }),
      total,
      page: safePage,
      limit: safeLimit
    }
  }

  async function getReportDetail({ actor, reportId }) {
    const response = await ftth.getReportById(reportId)
    const report = response.data || response
    if (!report) throw historyError('NOT_FOUND', 'Laporan tidak ditemukan.')
    if (actor.role !== 'SUPERADMIN' && report.user_id !== actor.id) throw historyError('NOT_FOUND', 'Laporan tidak ditemukan.')

    let rawDocs = report.dokumentasi || report.dokumentasi_laporan || []
    if (!Array.isArray(rawDocs) || rawDocs.length === 0) {
      const docsResponse = await ftth.getDocumentation({ laporan_id: reportId }).catch(() => [])
      const docsList = docsResponse.data || docsResponse || []
      rawDocs = (Array.isArray(docsList) ? docsList : [docsList]).filter(
        (item) => (item.laporan_id || item.laporanId) === reportId
      )
    } else {
      rawDocs = rawDocs.filter((item) => !item.laporan_id || item.laporan_id === reportId)
    }

    const dokumentasi = await Promise.all(
      rawDocs.map(async (item) => {
        let signedUrl = item.file_url || item.storagePath
        if (item.file_url && item.file_url.startsWith('/uploads/')) {
          signedUrl = 'https://ftth.digitak.id' + item.file_url
        } else if (storage?.createSignedUrl && item.file_url && !item.file_url.startsWith('http')) {
          try { signedUrl = await storage.createSignedUrl(item.file_url, 600) } catch { /* use original */ }
        } else if (signedUrl && !signedUrl.startsWith('http')) {
          signedUrl = '/api/files/' + signedUrl.replace(/^\/+/, '')
        }
        return { ...item, signedUrl }
      })
    )
    return { ...report, dokumentasi }
  }

  async function listAdminReports(filters = {}) {
    const { page = 1, limit = 20, from, to, pegawaiId, projectId, clusterId, processId, search } = filters
    const safePage = Math.max(1, Number(page) || 1)
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
    const ftFilters = {
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
    }
    if (pegawaiId) ftFilters.user_id = pegawaiId
    if (clusterId) ftFilters.cluster_id = clusterId
    if (projectId) ftFilters.project_id = projectId
    if (processId) ftFilters.process_id = processId
    if (from || to) {
      if (from) ftFilters.from = from
      if (to) ftFilters.to = to
    }
    if (search) ftFilters.search = search

    const response = await ftth.getReports(ftFilters)
    const items = response.data || response || []
    const total = response.total || items.length || 0
    return { items, total, page: safePage, limit: safeLimit }
  }

  async function listDocumentation(filters = {}) {
    const { projectId, clusterId, processId } = filters
    const ftFilters = {}
    if (clusterId) ftFilters.cluster_id = clusterId
    if (projectId) ftFilters.project_id = projectId
    if (processId) ftFilters.process_id = processId

    const reportsResponse = await ftth.getReports(ftFilters)
    const reports = reportsResponse.data || reportsResponse || []
    const items = []

    for (const report of (Array.isArray(reports) ? reports : [reports])) {
      let docs = report.dokumentasi || report.dokumentasi_laporan || []
      if (!Array.isArray(docs) || docs.length === 0) {
        const docsResponse = await ftth.getDocumentation({ laporan_id: report.id }).catch(() => [])
        const docsList = docsResponse.data || docsResponse || []
        docs = (Array.isArray(docsList) ? docsList : [docsList]).filter(
          (d) => (d.laporan_id || d.laporanId) === report.id
        )
      } else {
        docs = docs.filter((d) => !d.laporan_id || d.laporan_id === report.id)
      }

      for (const doc of docs) {
        let signedUrl = doc.file_url
        if (doc.file_url && doc.file_url.startsWith('/uploads/')) {
          signedUrl = 'https://ftth.digitak.id' + doc.file_url
        } else if (storage?.createSignedUrl && doc.file_url && !doc.file_url.startsWith('http')) {
          try { signedUrl = await storage.createSignedUrl(doc.file_url, 600) } catch { /* use original */ }
        } else if (doc.file_url && !doc.file_url.startsWith('http')) {
          signedUrl = '/api/files/' + doc.file_url.replace(/^\/+/, '')
        }
        items.push({
          id: doc.id,
          storagePath: doc.file_url,
          signedUrl: signedUrl || doc.file_url,
          originalName: doc.original_name,
          mimeType: doc.mime_type,
          fileSize: doc.file_size,
          createdAt: doc.created_at || doc.createdAt,
          laporanId: report.id,
          tanggalKegiatan: report.tanggal_kegiatan || report.tanggalKegiatan,
          keterangan: report.keterangan,
          status: report.status,
          pegawai: report.user,
          project: report.project,
          cluster: report.cluster,
          process: report.master_process || report.process,
        })
      }
    }

    return { items, total: items.length }
  }

  return { listOwnReports, getReportDetail, listAdminReports, listDocumentation }
}