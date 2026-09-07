function integrationError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

export function createFtthClient({
  baseUrl = process.env.FTTH_API_BASE_URL || 'https://ftth.digitak.id/ftth_api/integration',
  apiKey = process.env.FTTH_API_KEY,
  timeoutMs = Number(process.env.FTTH_API_TIMEOUT_MS || 10_000),
  fetchImpl = globalThis.fetch,
} = {}) {
  const normalizedBaseUrl = String(baseUrl || '').replace(/\/+$/, '')
  const configured = Boolean(normalizedBaseUrl && apiKey)

  async function request(path, query = {}, method = 'GET', body) {
    const multipart = body instanceof FormData
    if (!configured) {
      throw integrationError(
        'INTEGRATION_NOT_CONFIGURED',
        'Integrasi FTTH belum dikonfigurasi pada backend.',
      )
    }

    let response
    try {
      const url = new URL(`${normalizedBaseUrl}${path}`)
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
      }
      response = await fetchImpl(url, {
        method,
        redirect: 'error',
        headers: { accept: 'application/json', 'x-api-key': apiKey, ...(body === undefined || multipart ? {} : { 'content-type': 'application/json' }) },
        ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) }),
        signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? Math.max(1_000, timeoutMs) : 10_000),
      })
    } catch {
      throw integrationError(
        'INTEGRATION_UNAVAILABLE',
        'API FTTH tidak dapat dihubungi. Coba sinkronkan kembali.',
      )
    }

    if (!response.ok) {
      throw integrationError(
        response.status === 401 ? 'INTEGRATION_UNAUTHORIZED' : 'INTEGRATION_UNAVAILABLE',
        response.status === 401
          ? 'Kredensial integrasi FTTH ditolak.'
          : `API FTTH mengembalikan status ${response.status}.`,
      )
    }

    if (response.status === 204) return null
    try {
      return await response.json()
    } catch {
      throw integrationError(
        'INTEGRATION_INVALID_RESPONSE',
        'Respons API FTTH bukan JSON yang valid.',
      )
    }
  }
  async function download(path, query = {}) {
    if (!configured) throw integrationError('INTEGRATION_NOT_CONFIGURED', 'Integrasi FTTH belum dikonfigurasi pada backend.')
    try {
      const url = new URL(`${normalizedBaseUrl}${path}`)
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
      }
      const response = await fetchImpl(url, {
        method: 'GET', redirect: 'error', headers: { 'x-api-key': apiKey },
        signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? Math.max(1000, timeoutMs) : 10000),
      })
      if (!response.ok) throw integrationError(response.status === 404 ? 'NOT_FOUND' : 'INTEGRATION_UNAVAILABLE', `Download FTTH gagal (${response.status}).`)
      return response
    } catch (error) {
      if (error.code) throw error
      throw integrationError('INTEGRATION_UNAVAILABLE', 'File FTTH tidak dapat diunduh.')
    }
  }

  return {
    configured,
    uploadAttachment: (file) => {
      const body = new FormData()
      body.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname)
      return request('/dokumentasi-laporan/upload', {}, 'POST', body)
    },
    listCategories: () => request('/master-categories'),
    listProcesses: () => request('/master-processes'),
    listProjects: (query) => request('/projects', query),
    listClusters: (query) => request('/clusters', query),
    listClusterProcesses: (query) => request('/cluster-processes', query),
    listUsers: (query) => request('/users', query),
    getUser: (id) => request(`/users/${encodeURIComponent(id)}`),
    getProject: (id) => request(`/projects/${encodeURIComponent(id)}`),
    getCluster: (id) => request(`/clusters/${encodeURIComponent(id)}`),
    getProcess: (id) => request(`/master-processes/${encodeURIComponent(id)}`),
    getUserPhoto: (id, { forceDownload = false } = {}) => download(`/users/${encodeURIComponent(id)}/foto`, forceDownload ? { mode: 'download' } : {}),
    uploadUserPhoto: (id, file) => {
      const body = new FormData()
      body.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname)
      return request(`/users/${encodeURIComponent(id)}/foto`, {}, 'POST', body)
    },
    listReports: (query) => request('/laporan-kegiatan', query),
    getReport: (id) => request(`/laporan-kegiatan/${encodeURIComponent(id)}`),
    createReport: (body) => request('/laporan-kegiatan', {}, 'POST', body),
    updateReport: (id, body) => request(`/laporan-kegiatan/${encodeURIComponent(id)}`, {}, 'PUT', body),
    deleteReport: (id) => request(`/laporan-kegiatan/${encodeURIComponent(id)}`, {}, 'DELETE'),
    listAttachments: (id) => request('/dokumentasi-laporan', { laporanId: id }),
    createAttachment: (body) => request('/dokumentasi-laporan', {}, 'POST', body),
    downloadAttachment: (id, { forceDownload = false } = {}) => download(`/dokumentasi-laporan/${encodeURIComponent(id)}/download`, forceDownload ? { mode: 'download' } : {}),
  }
}
