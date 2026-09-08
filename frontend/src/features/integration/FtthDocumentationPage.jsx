import { useEffect, useMemo, useState } from 'react'
import { dashboardApi } from '../../api/dashboard.js'
import { API_URL } from '../../api/http.js'
import { ftthApi } from '../../api/ftth.js'
import DokumentasiPage from '../dashboard/DokumentasiPage.jsx'

export default function DocumentationRoute() {
  const [source, setSource] = useState(null), [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    ftthApi.status().then((data) => {
      if (!['local', 'ftth'].includes(data.documentationSource)) throw new Error('Konfigurasi dokumentasi belum tersedia. Restart backend.')
      if (active) { setSource(data.documentationSource); setError('') }
    }).catch((e) => { if (active) setError(e.message) })
    return () => { active = false }
  }, [attempt])
  if (error) return <section className="page"><p role="alert">{error}</p><button onClick={() => setAttempt((x) => x + 1)}>Coba lagi</button></section>
  if (!source) return <p role="status">Menyiapkan sumber dokumentasi…</p>
  return source === 'local' ? <DokumentasiPage /> : <FtthDocumentationPage />
}

export function FtthDocumentationPage() {
  const [data, setData] = useState({ items: [], options: { projects: [], clusters: [], processes: [] } })
  const [filters, setFilters] = useState({ projectId: '', clusterId: '', pekerjaanId: '' })
  const [applied, setApplied] = useState({})
  const [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [images, setImages] = useState({})
  useEffect(() => {
    let active = true
    dashboardApi.listDocumentation(applied).then(({ data }) => {
      if (data.source !== 'ftth') throw new Error('Sumber dokumentasi berubah. Muat ulang halaman.')
      if (active) { setData(data); setError(''); setLoading(false) }
    }).catch((e) => { if (active) { setError(e.message); setLoading(false) } })
    return () => { active = false }
  }, [applied])
  function load(next) { setLoading(true); setImages({}); setApplied({ ...next }) }
  const pages = useMemo(() => {
    const groups = new Map()
    for (const item of data.items) {
      const key = `${item.projectId}/${item.clusterId}/${item.processId}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(item)
    }
    return [...groups.entries()].flatMap(([key, items]) => {
      const result = []
      for (let i = 0; i < items.length; i += 6) result.push({ key: `${key}/${i}`, items: items.slice(i, i + 6) })
      return result
    })
  }, [data.items])
  const photos = data.items.filter((item) => /^image\/(jpeg|png|webp|gif|bmp)$/i.test(item.mimeType || ''))
  const readyToPrint = photos.every((item) => images[item.id] === 'loaded')
  const options = (rows) => rows.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)
  return <section className="page documentation-page">
    <header className="no-print"><h1>Dokumentasi Kegiatan</h1><p>Sumber: API perusahaan. Project → Cluster → Pekerjaan → Lampiran.</p></header>
    <form className="documentation-filters no-print" onSubmit={(e) => { e.preventDefault(); load(filters) }}>
      <label>Project<select value={filters.projectId} onChange={(e) => setFilters({ ...filters, projectId: e.target.value, clusterId: '' })}><option value="">Semua Project</option>{options(data.options.projects)}</select></label>
      <label>Cluster<select disabled={!filters.projectId} value={filters.clusterId} onChange={(e) => setFilters({ ...filters, clusterId: e.target.value })}><option value="">Semua Cluster</option>{options(data.options.clusters.filter((x) => x.projectId === filters.projectId))}</select></label>
      <label>Pekerjaan<select value={filters.pekerjaanId} onChange={(e) => setFilters({ ...filters, pekerjaanId: e.target.value })}><option value="">Semua Pekerjaan</option>{options(data.options.processes)}</select></label>
      <button type="submit" disabled={loading}>Tampilkan</button>
      <button type="button" disabled={loading} onClick={() => { const reset = { projectId: '', clusterId: '', pekerjaanId: '' }; setFilters(reset); load(reset) }}>Reset</button>
    </form>
    {loading ? <p role="status">Memuat dokumentasi…</p> : error ? <div><p role="alert">{error}</p><button onClick={() => load(applied)}>Coba lagi</button></div> : <>
      <div className="preview-toolbar no-print"><p>{data.items.length} lampiran · {pages.length} halaman. Dokumen nonfoto ditampilkan sebagai tautan, bukan digabung ke PDF.</p>
        <button disabled={!pages.length || !readyToPrint} onClick={() => window.print()}>Cetak / Simpan PDF</button>
      </div>
      {!readyToPrint && <p role="status" className="no-print">Foto sedang dimuat atau gagal dimuat. Cetak tersedia setelah semua foto berhasil dimuat.</p>}
      {!pages.length && <p>Dokumentasi tidak ditemukan untuk pilihan ini.</p>}
      <div className="pdf-preview-stage printable-area">{pages.map((page, index) => <article className="documentation-sheet" key={page.key}>
        <header className="documentation-sheet-header"><strong>Sistem Pelaporan</strong><strong>DOCUMENTATION</strong></header>
        <dl className="document-information"><div><dt>Project / Cluster</dt><dd>{page.items[0].projectName} · {page.items[0].clusterName}</dd></div><div><dt>Pekerjaan</dt><dd>{page.items[0].processName}</dd></div></dl>
        <div className="document-photo-grid">{page.items.map((item) => <figure className="document-photo-item" key={item.id}>
          <figcaption>{item.originalName}</figcaption>
          <div className="document-photo-frame">{photos.some((photo) => photo.id === item.id) ? <img crossOrigin="use-credentials" src={`${API_URL}${item.downloadUrl}`} alt={item.originalName} onLoad={() => setImages((x) => ({ ...x, [item.id]: 'loaded' }))} onError={() => setImages((x) => ({ ...x, [item.id]: 'failed' }))} /> : <p>Dokumen: {item.originalName}</p>}</div>
          <div className="document-photo-meta"><span>{String(item.tanggal || '').slice(0, 10)}</span><p>{item.keterangan}</p><a className="no-print" href={`${API_URL}${item.downloadUrl}`} target="_blank" rel="noreferrer">Buka lampiran</a>{' · '}<a className="no-print" href={`${API_URL}${item.downloadUrl}?mode=download`}>Unduh</a></div>
        </figure>)}</div><footer>Halaman {index + 1} dari {pages.length}</footer>
      </article>)}</div>
    </>}
  </section>
}
