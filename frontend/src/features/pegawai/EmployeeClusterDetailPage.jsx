import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ftthApi } from '../../api/ftth.js'
import './employee-dashboard.css'

const isDone = (status) => ['completed', 'selesai'].includes(String(status).toLowerCase())
const validLocation = (c) => c.latitude != null && c.longitude != null &&
  Number.isFinite(Number(c.latitude)) && Number.isFinite(Number(c.longitude)) &&
  Math.abs(Number(c.latitude)) <= 90 && Math.abs(Number(c.longitude)) <= 180

export default function EmployeeClusterDetailPage() {
  const { id } = useParams()
  const [cluster, setCluster] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('')
  const mapRef = useRef(null)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')
    ftthApi.clusterDetail(id).then((data) => {
      if (!ignore) { setCluster(data); setActiveTab(data.categories_summary?.[0]?.id || '') }
    }).catch((err) => { if (!ignore) setError(err.message || 'Gagal memuat cluster.') })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [id])

  useEffect(() => {
    if (loading || !mapRef.current || !cluster || !validLocation(cluster)) return
    const point = [Number(cluster.latitude), Number(cluster.longitude)]
    const map = L.map(mapRef.current, { center: point, zoom: 15, zoomControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
    }).addTo(map)
    const icon = L.divIcon({ className: 'custom-cluster-pin',
      html: '<div class="pin-marker-body"><div class="pin-marker-dot"></div></div>', iconSize: [28, 28], iconAnchor: [14, 28] })
    const popup = document.createElement('div')
    popup.textContent = cluster.name
    L.marker(point, { icon }).addTo(map).bindPopup(popup)
    const timer = setTimeout(() => map.invalidateSize(), 200)
    return () => { clearTimeout(timer); map.remove() }
  }, [cluster, loading])

  if (loading) return <div className="cluster-detail-container" role="status">Memuat detail cluster…</div>
  if (error || !cluster) return <div className="cluster-detail-container">
    <p role="alert" className="ftth-error">{error || 'Cluster tidak ditemukan.'}</p>
    <Link to="/pegawai/clusters">Kembali ke daftar cluster</Link>
  </div>

  const categories = cluster.categories_summary || []
  const current = categories.find((cat) => cat.id === activeTab) || categories[0]
  const target = cluster.homepass_target ?? null
  const achieved = cluster.homepass_achieved ?? null
  const percentage = target > 0 && achieved != null ? Math.round(achieved / target * 100) : null
  const progress = cluster.overall_progress ?? 0

  return <div className="cluster-detail-container">
    <nav className="cluster-breadcrumb" aria-label="Jejak halaman">
      <Link to="/pegawai/projects">Project saya</Link><span>/</span>
      <span>{cluster.project_name}</span><span>/</span><span>{cluster.name}</span>
    </nav>
    <section className="cluster-detail-top-card">
      <div className="cluster-detail-title-row"><h1>{cluster.name}</h1>
        <span className="status-badge">{cluster.status || 'Status belum tersedia'}</span></div>
      <p className="ftth-helper">Hanya pekerjaan yang ditugaskan kepada Anda sebagai PIC. Status dibaca dari FTTH.</p>
      <div className="cluster-detail-grid-top">
        <div className="cluster-detail-map-wrap">
          {validLocation(cluster) ? <div ref={mapRef} style={{ width: '100%', height: '100%' }} id="cluster-detail-map" />
            : <p className="ftth-helper">Koordinat cluster belum tersedia.</p>}
        </div>
        <div className="cluster-detail-side-cards">
          <section className="cluster-side-box"><h3>Homepass</h3>
            <div className="homepass-numbers"><div><small>Target</small><strong>{target ?? '—'}</strong></div>
              <div><small>Tercapai</small><strong>{achieved ?? '—'}</strong></div></div>
            <div className="homepass-bar-track"><div className="homepass-bar-fill" style={{ width: `${Math.max(0, Math.min(100, percentage ?? 0))}%` }} /></div>
            <p>{percentage == null ? 'Persentase belum tersedia' : `${percentage}%`}</p>
          </section>
          <section className="cluster-side-box"><h3>Peta cluster</h3>
            <p>{cluster.kmz_file ? `Berkas FTTH: ${cluster.kmz_file}` : 'Berkas KMZ/KML belum tersedia.'}</p>
            <p className="ftth-helper">Peta hanya menampilkan titik koordinat, bukan batas KMZ. Pengelolaan berkas dilakukan di FTTH.</p>
          </section>
        </div>
      </div>
    </section>
    <section className="cluster-detail-progress-section">
      <div className="cluster-progress-label-row"><h2>Progres pekerjaan saya</h2><strong>{progress}%</strong></div>
      <div className="cluster-progress-track"><div className="cluster-progress-fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div>
      <div className="cluster-detail-cat-cards">{categories.map((cat) => <div key={cat.id} className="cluster-cat-summary-box">
        <strong>{cat.name}</strong><span>{cat.completed}/{cat.total} selesai</span>
      </div>)}</div>
    </section>
    <div className="cluster-category-tabs" aria-label="Kategori pekerjaan">{categories.map((cat) =>
      <button key={cat.id} type="button" aria-pressed={current?.id === cat.id} className={`category-tab-btn ${current?.id === cat.id ? 'is-active' : ''}`}
        onClick={() => setActiveTab(cat.id)}>{cat.name}</button>)}</div>
    <div className="cluster-process-list">{current?.items?.length ? current.items.map((item) => {
      const done = isDone(item.status)
      return <article key={item.id} className="cluster-process-card">
        <div className="cluster-process-header-row"><h3>{item.name}</h3>
          <span className={`process-status-tag ${done ? 'is-completed' : 'is-on_progress'}`}>{done ? 'Selesai' : item.status || 'Belum dimulai'}</span></div>
        <p>{item.input_instruction || 'Ikuti instruksi pekerjaan dari FTTH.'}</p>
        <p className="ftth-helper">{item.reportCount || 0} laporan Anda untuk pekerjaan ini.</p>
        {done ? <p className="ftth-note">Pekerjaan selesai. Anda tidak perlu mengisi laporan harian untuk pekerjaan ini lagi.</p>
          : <Link className="cluster-report-action-btn" to={`/pegawai/laporan/new?cluster_id=${encodeURIComponent(cluster.id)}&process_id=${encodeURIComponent(item.process_id)}`}>Isi laporan pekerjaan</Link>}
      </article>
    }) : <p className="cluster-process-card">Belum ada pekerjaan yang ditugaskan kepada Anda pada cluster ini.</p>}</div>
  </div>
}
