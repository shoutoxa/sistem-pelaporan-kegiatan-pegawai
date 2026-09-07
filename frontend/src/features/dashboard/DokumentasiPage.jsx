import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../../api/dashboard.js'
import { masterApi } from '../../api/master.js'
import PageHeader from '../../components/PageHeader.jsx'
import PageState from '../../components/PageState.jsx'
import Icon from '../../components/Icon.jsx'
import { resolveFileUrl } from '../../utils/fileUrl.js'

const emptyFilters = { projectId: '', clusterId: '', processId: '' }
const photosPerPage = 6

function getFileIcon(mimeType) {
  if (!mimeType) return '📎'
  if (mimeType.startsWith('image/')) return '🖼'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('kmz') || mimeType.includes('kml')) return '🗺️'
  return '📎'
}

export default function DokumentasiPage() {
  const [data, setData] = useState({ items: [], total: 0 })
  const [state, setState] = useState('loading')
  const [filters, setFilters] = useState(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters)
  const [projectOptions, setProjectOptions] = useState([])
  const [clusterOptions, setClusterOptions] = useState([])
  const [processOptions, setProcessOptions] = useState([])
  const [loadingCluster, setLoadingCluster] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState(new Set())
  const [expandedCategories, setExpandedCategories] = useState(new Set())

  useEffect(() => {
    let active = true
    Promise.all([masterApi.fetchProject(), masterApi.fetchCategory()])
      .then(([projects, categories]) => {
        if (!active) return
        setProjectOptions(Array.isArray(projects) ? projects : [])
        setProcessOptions(Array.isArray(categories) ? categories : [])
      })
      .catch(() => {
        if (!active) return
        setProjectOptions([])
        setProcessOptions([])
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setState('loading')
    dashboardApi
      .listDocumentation(appliedFilters)
      .then((response) => {
        if (!active) return
        setData(response.data || response)
        setState('ready')
      })
      .catch(() => {
        if (active) setState('error')
      })
    return () => { active = false }
  }, [appliedFilters])

  async function handleProjectChange(event) {
    const projectId = event.target.value
    setFilters((current) => ({ ...current, projectId, clusterId: '' }))
    setClusterOptions([])
    if (!projectId) return

    setLoadingCluster(true)
    try {
      const rows = await masterApi.fetchClusterByProject(projectId)
      setClusterOptions(Array.isArray(rows) ? rows : [])
    } catch {
      setClusterOptions([])
    } finally {
      setLoadingCluster(false)
    }
  }

  async function handleCategoryChange(event) {
    const categoryId = event.target.value
    setFilters((current) => ({ ...current, processId: '' }))
    setProcessOptions([])
    if (!categoryId) return

    try {
      const rows = await masterApi.fetchProcessByCategory(categoryId)
      setProcessOptions(Array.isArray(rows) ? rows : [])
    } catch {
      setProcessOptions([])
    }
  }

  function applyFilters(event) {
    event.preventDefault()
    setAppliedFilters({ ...filters })
  }

  function resetFilters() {
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setClusterOptions([])
    setProcessOptions([])
  }

  function toggleProject(projectName) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectName)) next.delete(projectName)
      else next.add(projectName)
      return next
    })
  }

  function toggleCategory(categoryName) {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryName)) next.delete(categoryName)
      else next.add(categoryName)
      return next
    })
  }

  const groupedData = useMemo(() => {
    const projectMap = new Map()
    const categoryMap = new Map()

    for (const item of data.items) {
      const projectName = item.project?.name || 'Tanpa Project'
      const categoryName = item.process?.master_category?.name || item.category?.name || 'Tanpa Kategori'
      const clusterName = item.cluster?.name || 'Tanpa Cluster'
      const processName = item.process?.name || item.master_process?.name || 'Tanpa Pekerjaan'
      const processId = item.process?.id || item.master_process?.id
      const docType = item.mimeType?.startsWith('image/') ? 'foto' : 'dokumen'

      if (!projectMap.has(projectName)) projectMap.set(projectName, new Map())
      const categoryInProject = projectMap.get(projectName)
      if (!categoryInProject.has(categoryName)) categoryInProject.set(categoryName, new Map())
      const clusterInCategory = categoryInProject.get(categoryName)
      if (!clusterInCategory.has(clusterName)) clusterInCategory.set(clusterName, new Map())
      const processInCluster = clusterInCategory.get(clusterName)
      const docKey = `${processName}|${processId}`
      if (!processInCluster.has(docKey)) processInCluster.set(docKey, { processName, processId, docs: [], docType })
      processInCluster.get(docKey).docs.push(item)
    }

    return { projectMap, total: data.items.length }
  }, [data.items])

  const selectedNames = useMemo(() => ({
    project: projectOptions.find((item) => item.id === appliedFilters.projectId)?.name || 'Semua Project',
    cluster: clusterOptions.find((item) => item.id === appliedFilters.clusterId)?.name || 'Semua Cluster',
    process: processOptions.find((item) => item.id === appliedFilters.processId)?.name || 'Semua Pekerjaan',
  }), [appliedFilters, clusterOptions, projectOptions, processOptions])

  return (
    <section className="page documentation-page">
      <PageHeader
        title="Dokumentasi Kegiatan"
        description="Jelajahi dokumentasi kegiatan berdasarkan Project dan Kategori."
      />

      <section className="data-section documentation-filter-card no-print">
        <div className="section-heading">
          <div>
            <h2>Filter dokumentasi</h2>
            <p>Gunakan satu atau beberapa pilihan untuk mempersempit hasil dokumentasi.</p>
          </div>
        </div>
        <form className="documentation-filters" onSubmit={applyFilters}>
          <label htmlFor="documentation-project">
            Project
            <select id="documentation-project" value={filters.projectId} onChange={handleProjectChange}>
              <option value="">Semua Project</option>
              {projectOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label htmlFor="documentation-cluster">
            Cluster
            <select
              id="documentation-cluster"
              value={filters.clusterId}
              disabled={!filters.projectId || loadingCluster}
              onChange={(event) => setFilters((current) => ({ ...current, clusterId: event.target.value }))}
            >
              <option value="">
                {loadingCluster ? 'Memuat Cluster...' : filters.projectId ? 'Semua Cluster' : 'Pilih Project terlebih dahulu'}
              </option>
              {clusterOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label htmlFor="documentation-process">
            Kategori
            <select
              id="documentation-process"
              value={filters.processId}
              onChange={handleCategoryChange}
            >
              <option value="">Semua Kategori</option>
              {processOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <div className="documentation-filter-actions">
            <button className="primary-button icon-label" type="submit" disabled={state === 'loading'}>
              <Icon name="search" />
              Tampilkan
            </button>
            <button className="secondary-button" type="button" onClick={resetFilters} disabled={state === 'loading'}>
              Reset
            </button>
          </div>
        </form>
      </section>

      {state === 'loading' && (
        <PageState title="Menyiapkan dokumentasi" message="Mengambil dokumentasi sesuai filter yang dipilih." />
      )}

      {state === 'error' && (
        <PageState tone="error" title="Gagal memuat dokumentasi" message="Periksa koneksi server, lalu coba kembali." />
      )}

      {state === 'ready' && (
        <section className="documentation-preview-panel">
          <div className="preview-toolbar no-print">
            <div>
              <span className="preview-eyebrow">Folder dokumentasi</span>
              <h2>{selectedNames.project} · {selectedNames.cluster}</h2>
              <p>{selectedNames.process} · {data.total} file</p>
            </div>
          </div>

          {data.items.length === 0 ? (
            <PageState
              title="Dokumentasi tidak ditemukan"
              message="Belum ada dokumentasi untuk kombinasi Project, Cluster, dan Kategori yang dipilih."
            />
          ) : (
            <div className="folder-explorer">
              {[...groupedData.projectMap.entries()].map(([projectName, categories]) => {
                const isProjectExpanded = expandedProjects.has(projectName)
                return (
                  <div key={projectName} className="folder-project">
                    <button
                      className="folder-project-header"
                      onClick={() => toggleProject(projectName)}
                      aria-expanded={isProjectExpanded}
                    >
                      <span className="folder-icon">{isProjectExpanded ? '📂' : '📁'}</span>
                      <span className="folder-name">{projectName}</span>
                      <span className="folder-count">{[...categories.values()].reduce((acc, clusters) => acc + [...clusters.values()].reduce((a, processes) => a + [...processes.values()].reduce((aa, p) => aa + p.docs.length, 0), 0), 0)} file</span>
                    </button>
                    {isProjectExpanded && (
                      <div className="folder-categories">
                        {[...categories.entries()].map(([categoryName, clusters]) => {
                          const isCategoryExpanded = expandedCategories.has(`${projectName}|${categoryName}`)
                          return (
                            <div key={categoryName} className="folder-category">
                              <button
                                className="folder-category-header"
                                onClick={() => toggleCategory(`${projectName}|${categoryName}`)}
                                aria-expanded={isCategoryExpanded}
                              >
                                <span className="folder-icon">{isCategoryExpanded ? '📂' : '📁'}</span>
                                <span className="folder-name">{categoryName}</span>
                              </button>
                              {isCategoryExpanded && (
                                <div className="folder-clusters">
                                  {[...clusters.entries()].map(([clusterName, processes]) => (
                                    <div key={clusterName} className="folder-cluster">
                                      <div className="folder-cluster-header">
                                        <span className="folder-icon">📂</span>
                                        <span className="folder-name">{clusterName}</span>
                                      </div>
                                      <div className="folder-files">
                                        {[...processes.values()].map(({ processName, docs, docType }) => (
                                          <div key={processName} className="folder-process">
                                            <div className="folder-process-header">
                                              <span className="folder-icon">{docType === 'foto' ? '📷' : '📄'}</span>
                                              <span className="folder-name">{processName}</span>
                                              <span className="folder-count">{docs.length} {docType === 'foto' ? 'foto' : 'file'}</span>
                                            </div>
                                            <div className="folder-docs-grid">
                                              {docs.map((item) => (
                                                <figure key={item.id} className="folder-doc-item">
                                                  {item.mimeType?.startsWith('image/') ? (
                                                    <img
                                                      src={resolveFileUrl(item.signedUrl || item.storagePath || item.file_url)}
                                                      alt={item.originalName || processName}
                                                    />
                                                  ) : (
                                                    <div className="file-icon-large">{getFileIcon(item.mimeType)}</div>
                                                  )}
                                                  <figcaption>
                                                    <strong>{item.originalName || processName}</strong>
                                                    <small>
                                                      {(item.fileSize / 1_000_000).toFixed(2)} MB · {String(item.tanggalKegiatan || '').slice(0, 10)}
                                                    </small>
                                                  </figcaption>
                                                  <div className="folder-doc-actions">
                                                    <a
                                                      href={resolveFileUrl(item.signedUrl || item.storagePath || item.file_url)}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="table-link"
                                                    >
                                                      Buka <Icon name="chevronRight" size={14} />
                                                    </a>
                                                    <Link className="table-link" to={`/admin/laporan/${item.laporanId}`}>
                                                      Laporan <Icon name="chevronRight" size={14} />
                                                    </Link>
                                                  </div>
                                                </figure>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    </section>
  )
}