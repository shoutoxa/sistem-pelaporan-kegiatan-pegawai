import { FTTH_CONFIG } from '../config/ftth.js'

async function ftthRequest(path, options = {}) {
  const url = FTTH_CONFIG.baseUrl + path
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const baseHeaders = { ...FTTH_CONFIG.headers }
  if (isFormData) {
    delete baseHeaders['Content-Type']
  }
  const headers = {
    ...baseHeaders,
    ...(options.headers || {}),
  }
  if (isFormData && headers['Content-Type']) {
    delete headers['Content-Type']
  }
  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const error = new Error(body.message || 'FTTH API error: ' + response.status)
    error.status = response.status
    error.code = body.code
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}

function buildQuery(params) {
  const entries = Object.entries(params).filter(([, v]) => v != null)
  if (entries.length === 0) return ''
  return '?' + new URLSearchParams(entries).toString()
}

export const ftthApi = {
  getProjects: () => ftthRequest('/integration/projects'),
  getProjectById: (id) => ftthRequest('/integration/projects/' + id),
  getClusters: (params = {}) => ftthRequest('/integration/clusters' + buildQuery(params)),
  getClusterById: (id) => ftthRequest('/integration/clusters/' + id),
  getMasterCategories: () => ftthRequest('/integration/master-categories'),
  getMasterProcesses: (params = {}) => ftthRequest('/integration/master-processes' + buildQuery(params)),
  getMasterProcessById: (id) => ftthRequest('/integration/master-processes/' + id),
  getMasterProcessForms: (processId) => ftthRequest('/integration/master-process-forms' + (processId ? '?processId=' + processId : '')),
  getReports: (params = {}) => ftthRequest('/integration/laporan-kegiatan' + buildQuery(params)),
  getReportById: (id) => ftthRequest('/integration/laporan-kegiatan/' + id),
  createReport: (payload) => ftthRequest('/integration/laporan-kegiatan', { method: 'POST', body: JSON.stringify(payload) }),
  updateReport: (id, payload) => ftthRequest('/integration/laporan-kegiatan/' + id, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteReport: (id) => ftthRequest('/integration/laporan-kegiatan/' + id, { method: 'DELETE' }),
  getDocumentation: (params = {}) => ftthRequest('/integration/dokumentasi-laporan' + buildQuery(params)),
  getDocumentationById: (id) => ftthRequest('/integration/dokumentasi-laporan/' + id),
  uploadDocumentation: (fileBuffer, fileName, mimeType) => {
    const formData = new FormData()
    formData.append('file', new Blob([fileBuffer], { type: mimeType }), fileName)
    return ftthRequest('/integration/dokumentasi-laporan/upload', {
      method: 'POST',
      headers: { 'x-api-key': FTTH_CONFIG.apiKey },
      body: formData,
    })
  },
  createDocumentation: (payload) => ftthRequest('/integration/dokumentasi-laporan', { method: 'POST', body: JSON.stringify(payload) }),
  updateDocumentation: (id, payload) => ftthRequest('/integration/dokumentasi-laporan/' + id, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteDocumentation: (id) => ftthRequest('/integration/dokumentasi-laporan/' + id, { method: 'DELETE' }),
  getUsers: () => ftthRequest('/integration/users'),
  getUserById: (id) => ftthRequest('/integration/users/' + id),
}
