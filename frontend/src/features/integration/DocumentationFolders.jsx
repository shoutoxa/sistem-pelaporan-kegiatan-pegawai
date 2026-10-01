import { useMemo, useState } from 'react'
import JSZip from 'jszip'
import FtthAttachments from './FtthAttachments.jsx'
import { API_URL } from '../../api/http.js'
import './ftth.css'

export function sanitizePath(str) {
  return String(str || '')
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\.+$/g, '') || 'Lainnya'
}

export function groupDocumentation(items = []) {
  const projects = new Map()
  for (const item of items) {
    const projId = item.projectId || item.desa?.id || 'default-proj'
    const projName = item.projectName || item.desa?.namaDesa || 'Tanpa Project'
    if (!projects.has(projId)) {
      projects.set(projId, { id: projId, name: projName, clusters: new Map() })
    }
    const project = projects.get(projId)

    const clustId = item.clusterId || item.cluster?.id || 'default-cluster'
    const clustName = item.clusterName || item.cluster?.clusterName || 'Tanpa Cluster'
    if (!project.clusters.has(clustId)) {
      project.clusters.set(clustId, { id: clustId, name: clustName, categories: new Map(), processes: new Map() })
    }
    const cluster = project.clusters.get(clustId)

    const catId = item.categoryId || item.pekerjaan?.kategoriId || 'uncategorized'
    const catName = item.categoryName || item.pekerjaan?.kategori?.namaKategori || 'Belum dikategorikan'
    if (!cluster.categories.has(catId)) {
      cluster.categories.set(catId, { id: catId, name: catName, processes: new Map() })
    }
    const category = cluster.categories.get(catId)

    const procId = item.processId || item.pekerjaan?.id || 'default-proc'
    const procName = item.processName || item.pekerjaan?.namaPekerjaan || 'Tanpa Pekerjaan'

    if (!category.processes.has(procId)) {
      category.processes.set(procId, { id: procId, name: procName, categoryId: catId, categoryName: catName, items: [] })
    }
    category.processes.get(procId).items.push(item)

    // Keep processes directly on cluster for backwards compatibility with tests
    if (!cluster.processes.has(procId)) {
      cluster.processes.set(procId, { id: procId, name: procName, categoryId: catId, categoryName: catName, items: [] })
    }
    cluster.processes.get(procId).items.push(item)
  }

  return [...projects.values()].map((project) => ({
    ...project,
    clusters: [...project.clusters.values()].map((cluster) => ({
      ...cluster,
      categories: [...cluster.categories.values()].map((cat) => ({
        ...cat,
        processes: [...cat.processes.values()],
      })),
      processes: [...cluster.processes.values()],
    })),
  }))
}

export async function downloadZipHierarchy(items, onProgress) {
  const zip = new JSZip()
  const total = items.length
  if (total === 0) return

  const seenPaths = new Set()

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const proj = sanitizePath(item.projectName || item.desa?.namaDesa || 'Project')
    const clust = sanitizePath(item.clusterName || item.cluster?.clusterName || 'Cluster')
    const cat = sanitizePath(item.categoryName || item.pekerjaan?.kategori?.namaKategori || 'Kategori')
    const proc = sanitizePath(item.processName || item.pekerjaan?.namaPekerjaan || 'Pekerjaan')

    let originalName = sanitizePath(item.originalName || item.original_name || `berkas-${item.id}`)
    let fileName = originalName
    let collision = 1
    const lastDot = originalName.lastIndexOf('.')
    const base = lastDot > 0 ? originalName.slice(0, lastDot) : originalName
    const ext = lastDot > 0 ? originalName.slice(lastDot) : ''

    const folderPath = `${proj}/${clust}/${cat}/${proc}`
    while (seenPaths.has(`${folderPath}/${fileName.toLowerCase()}`)) {
      collision++
      fileName = `${base} (${collision})${ext}`
    }
    seenPaths.add(`${folderPath}/${fileName.toLowerCase()}`)

    if (onProgress) {
      onProgress({ completed: i, total, percent: Math.round((i / total) * 90), status: `Mengunduh (${i + 1}/${total}): ${fileName}` })
    }

    const url = item.downloadUrl
      ? (item.downloadUrl.startsWith('http') ? item.downloadUrl : `${API_URL}${item.downloadUrl}`)
      : (item.signedUrl || item.storagePath)

    if (url) {
      try {
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()
        zip.folder(proj).folder(clust).folder(cat).folder(proc).file(fileName, blob)
      } catch (err) {
        zip.folder(proj).folder(clust).folder(cat).folder(proc).file(`${fileName}.error.txt`, `Gagal mengunduh berkas: ${err.message}`)
      }
    }
  }

  if (onProgress) {
    onProgress({ completed: total, total, percent: 95, status: 'Mengemas arsip ZIP...' })
  }

  const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    if (onProgress && metadata.percent) {
      onProgress({ completed: total, total, percent: Math.round(90 + (metadata.percent * 0.1)), status: `Mengompresi ZIP (${Math.round(metadata.percent)}%)...` })
    }
  })

  const blobUrl = URL.createObjectURL(content)
  const anchor = document.createElement('a')
  anchor.href = blobUrl
  const dateStr = new Date().toISOString().slice(0, 10)
  anchor.download = `Dokumentasi-Kegiatan-${dateStr}.zip`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)

  if (onProgress) {
    onProgress({ completed: total, total, percent: 100, status: 'Pengunduhan selesai!' })
  }
}

export default function DocumentationFolders({ items = [] }) {
  const groups = useMemo(() => groupDocumentation(items), [items])
  const [expanded, setExpanded] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(null)
  const [downloadError, setDownloadError] = useState('')

  async function handleDownloadAll() {
    if (!items.length || downloading) return
    setDownloading(true)
    setDownloadError('')
    setDownloadProgress({ percent: 0, status: 'Memulai pengunduhan...' })
    try {
      await downloadZipHierarchy(items, setDownloadProgress)
    } catch (err) {
      setDownloadError(err.message || 'Gagal membuat arsip ZIP.')
    } finally {
      setTimeout(() => {
        setDownloading(false)
        setDownloadProgress(null)
      }, 1500)
    }
  }

  return (
    <section className="ftth-folders no-print" aria-label="Folder dokumentasi">
      <div className="ftth-folders-toolbar">
        <button
          type="button"
          className="secondary-button"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Tutup semua folder' : 'Buka semua folder'}
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={!items.length || downloading}
          onClick={handleDownloadAll}
        >
          {downloading ? 'Mengunduh...' : 'Unduh Semua File (Struktur Folder)'}
        </button>
      </div>

      {downloadProgress && (
        <div className="ftth-download-progress" role="status">
          <div className="progress-info">
            <span>{downloadProgress.status}</span>
            <span>{downloadProgress.percent}%</span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${downloadProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {downloadError && (
        <p className="ftth-error" role="alert">{downloadError}</p>
      )}

      {!items.length && <p>Tidak ada berkas dokumentasi pada pilihan ini.</p>}

      {groups.map((project) => (
        <details key={`${project.id}:${expanded}`} open={expanded}>
          <summary>
            <strong>{project.name}</strong> <small>· {project.clusters.length} cluster</small>
          </summary>
          {project.clusters.map((cluster) => (
            <details key={cluster.id} open={expanded}>
              <summary>
                <span>{cluster.name}</span> <small>· {cluster.categories.length} kategori</small>
              </summary>
              {cluster.categories.map((category) => (
                <details key={category.id} open={expanded}>
                  <summary>
                    <em>{category.name}</em> <small>· {category.processes.length} pekerjaan</small>
                  </summary>
                  {category.processes.map((process) => (
                    <details key={process.id} open={expanded}>
                      <summary>
                        {process.name} <small>· {process.items.length} lampiran</small>
                      </summary>
                      <FtthAttachments items={process.items} />
                    </details>
                  ))}
                </details>
              ))}
            </details>
          ))}
        </details>
      ))}
    </section>
  )
}
