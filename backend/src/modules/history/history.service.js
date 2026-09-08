import { ftthApi as defaultFtthApi } from '../../services/ftthApi.js'

function historyError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

export function createHistoryService({ storage, clock = () => new Date(), ftthApi: injectedFtthApi } = {}) {
  const ftth = injectedFtthApi || defaultFtthApi

  async function listOwnReports({ actor, page = 1, limit = 20, tanggal, processId, pekerjaanId }) {
    const safePage = Math.max(1, Number(page) || 1)
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
    const filters = {
      user_id: actor.id,
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
    }
    if (tanggal) filters.tanggal_kegiatan = tanggal
    const targetProcessId = processId || pekerjaanId
    if (targetProcessId) filters.process_id = targetProcessId

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
      limit: safeLimit,
    }
  }

  async function getReportDetail({ actor, reportId }) {
    const response = await ftth.getReportById(reportId)
    const report = response.data || response
    if (!report) throw historyError('NOT_FOUND', 'Laporan tidak ditemukan.')
    if (actor.role !== 'SUPERADMIN' && report.user_id !== actor.id) throw historyError('NOT_FOUND', 'Laporan tidak ditemukan.')

    let rawDocs = report.dokumentasi || report.dokumentasi_laporan || []
    if (!Array.isArray(rawDocs) || rawDocs.length === 0) {
      const docsResponse = typeof ftth.getDocumentation === 'function' ? await ftth.getDocumentation({ laporan_id: reportId }).catch(() => []) : []
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
    if (from) ftFilters.from = from
    if (to) ftFilters.to = to
    if (search) ftFilters.search = search

    const response = await ftth.getReports(ftFilters)
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
          user: item.user || { id: item.user_id, nama: item.user_name },
          cluster: item.cluster || { id: item.cluster_id, clusterName: item.cluster_name, desa: { namaDesa: item.project_name } },
          pekerjaan: item.master_process || item.process || { id: item.process_id, namaPekerjaan: item.process_name },
          dokumentasi,
          editableUntil: editableUntil.toISOString(),
          canEdit: item.status !== 'APPROVED' && now <= editableUntil.getTime(),
        }
      }),
      total,
      page: safePage,
      limit: safeLimit,
    }
  }

  async function listDocumentation(filters = {}) {
    const { page = 1, limit = 20, from, to, pegawaiId, projectId, clusterId, categoryId, processId } = filters
    const reportFilters = {}
    if (pegawaiId) reportFilters.user_id = pegawaiId
    if (clusterId) reportFilters.cluster_id = clusterId
    if (projectId) reportFilters.project_id = projectId
    if (processId) reportFilters.process_id = processId
    if (from) reportFilters.from = from
    if (to) reportFilters.to = to

    const reportsResponse = await ftth.getReports(reportFilters).catch(() => [])
    const reports = reportsResponse.data || reportsResponse || []
    const reportMap = new Map()
    for (const r of reports) {
      reportMap.set(r.id, r)
    }

    const docsResponse = await ftth.getDocumentation().catch(() => [])
    let docs = docsResponse.data || docsResponse || []

    const relevantDocs = docs.filter((d) => {
      const parentReport = reportMap.get(d.laporan_id || d.laporanId)
      if (!parentReport) return false
      if (categoryId) {
        const catId = parentReport.master_process?.master_category_id || parentReport.master_process?.category_id || parentReport.master_category_id
        if (catId !== categoryId) return false
      }
      return true
    })

    const safePage = Math.max(1, Number(page) || 1)
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
    const paged = relevantDocs.slice((safePage - 1) * safeLimit, safePage * safeLimit)

    return {
      items: await Promise.all(
        paged.map(async (doc) => {
          const parentReport = reportMap.get(doc.laporan_id || doc.laporanId)
          let signedUrl = doc.file_url || doc.storagePath
          if (doc.file_url && doc.file_url.startsWith('/uploads/')) {
            signedUrl = 'https://ftth.digitak.id' + doc.file_url
          } else if (storage?.createSignedUrl && doc.file_url && !doc.file_url.startsWith('http')) {
            try { signedUrl = await storage.createSignedUrl(doc.file_url, 600) } catch { /* ignore */ }
          } else if (signedUrl && !signedUrl.startsWith('http')) {
            signedUrl = '/api/files/' + signedUrl.replace(/^\/+/, '')
          }
          return {
            ...doc,
            signedUrl,
            laporan: parentReport ? {
              ...parentReport,
              user: parentReport.user || { id: parentReport.user_id, nama: parentReport.user_name },
              cluster: parentReport.cluster || { id: parentReport.cluster_id, clusterName: parentReport.cluster_name, desa: { namaDesa: parentReport.project_name } },
              pekerjaan: parentReport.master_process || parentReport.process || { id: parentReport.process_id, namaPekerjaan: parentReport.process_name },
            } : null,
          }
        })
      ),
      total: relevantDocs.length,
      page: safePage,
      limit: safeLimit,
    }
  }

  return { listOwnReports, getReportDetail, listAdminReports, listDocumentation }
}