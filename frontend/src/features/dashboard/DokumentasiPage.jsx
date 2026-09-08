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
  const [viewMode, setViewMode] = useState('pdf')
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

  const documentPages = useMemo(() => {
    const groups = new Map()

    for (const item of data.items) {
      const projectName = item.project?.name || item.cluster?.desa?.namaDesa || item.desa?.namaDesa || 'Tanpa Project'
      const clusterName = item.cluster?.name || item.cluster?.clusterName || 'Tanpa Cluster'
      const processName = item.process?.name || item.master_process?.name || item.pekerjaan?.namaPekerjaan || 'Tanpa Pekerjaan'
      const key = `${projectName}|${clusterName}|${processName}`
      if (!groups.has(key)) groups.set(key, { projectName, clusterName, processName, photos: [] })
      groups.get(key).photos.push(item)
    }

    return [...groups.values()].flatMap((group) => {
      const pages = []
      for (let index = 0; index < group.photos.length; index += photosPerPage) {
        pages.push({
          ...group,
          photos: group.photos.slice(index, index + photosPerPage),
          part: Math.floor(index / photosPerPage) + 1,
          totalParts: Math.ceil(group.photos.length / photosPerPage),
        })
      }
      return pages
    })
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
        description="Jelajahi dokumentasi kegiatan berdasarkan Project dan Kategori dalam tampilan Folder atau Lembar PDF."
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
              <span className="preview-eyebrow">
                {viewMode === 'folder' ? 'Folder Dokumentasi' : 'Preview Dokumen PDF'}
              </span>
              <h2>{selectedNames.project} · {selectedNames.cluster}</h2>
              <p>
                {selectedNames.process} · {data.total} file
                {viewMode === 'pdf' ? ` · ${documentPages.length} halaman` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className="view-mode-toggle no-print" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'pdf'}
                  className={viewMode === 'pdf' ? 'active-mode' : ''}
                  onClick={() => setViewMode('pdf')}
                >
                  📄 Format PDF / Cetak
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'folder'}
                  className={viewMode === 'folder' ? 'active-mode' : ''}
                  onClick={() => setViewMode('folder')}
                >
                  📁 Tampilan Folder
                </button>
              </div>
              {viewMode === 'pdf' && (
                <button
                  className="primary-button icon-label"
                  type="button"
                  disabled={documentPages.length === 0}
                  onClick={() => window.print()}
                >
                  <Icon name="download" />
                  Cetak / Simpan PDF
                </button>
              )}
            </div>
          </div>

          {data.items.length === 0 ? (
            <PageState
              title="Dokumentasi tidak ditemukan"
              message="Belum ada dokumentasi untuk kombinasi Project, Cluster, dan Kategori yang dipilih."
            />
          ) : viewMode === 'folder' ? (
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
                                                    <Link className="table-link" to={`/admin/laporan/${item.laporanId || item.laporan_id}`}>
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
          ) : (
            <div className="pdf-preview-stage printable-area">
              {documentPages.map((documentPage, pageIndex) => (
                <article
                  key={`${documentPage.projectName}-${documentPage.clusterName}-${documentPage.processName}-${documentPage.part}`}
                  className="documentation-sheet"
                >
                  <header className="documentation-sheet-header">
                    <div className="document-brand">
                      <span aria-hidden="true">SP</span>
                      <div>
                        <strong>Sistem Pelaporan</strong>
                        <small>Kegiatan Pegawai</small>
                      </div>
                    </div>
                    <strong className="document-type">PHOTO DOCUMENTATION</strong>
                  </header>
                  <dl className="document-information">
                    <div>
                      <dt>Lokasi</dt>
                      <dd>{documentPage.projectName} · {documentPage.clusterName}</dd>
                    </div>
                    <div>
                      <dt>Pekerjaan</dt>
                      <dd>{documentPage.processName}</dd>
                    </div>
                  </dl>
                  <div className="document-photo-grid">
                    {documentPage.photos.map((item) => (
                      <figure key={item.id} className="document-photo-item">
                        <figcaption>{item.originalName || documentPage.processName}</figcaption>
                        <div className="document-photo-frame">
                          <img
                            src={resolveFileUrl(item.signedUrl || item.storagePath || item.file_url)}
                            alt={`${documentPage.processName} di ${documentPage.projectName} ${documentPage.clusterName}`}
                          />
                        </div>
                        <div className="document-photo-meta">
                          <span>{String(item.tanggalKegiatan || item.created_at || '').slice(0, 10)}</span>
                          {item.keterangan && <p>{item.keterangan}</p>}
                          <Link className="table-link no-print" to={`/admin/laporan/${item.laporanId || item.laporan_id}`}>
                            Detail laporan <Icon name="chevronRight" size={14} />
                          </Link>
                        </div>
                      </figure>
                    ))}
                  </div>
                  <footer>
                    <span>{documentPage.totalParts > 1 ? `${documentPage.processName} (${documentPage.part}/${documentPage.totalParts})` : documentPage.processName}</span>
                    <span>Halaman {pageIndex + 1} dari {documentPages.length}</span>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  )
}