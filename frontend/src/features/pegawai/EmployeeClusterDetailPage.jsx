import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ftthApi } from '../../api/ftth.js'
import Icon from '../../components/Icon.jsx'
import './employee-dashboard.css'

export default function EmployeeClusterDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cluster, setCluster] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('')
  const [statusVal, setStatusVal] = useState('running')
  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    let ignore = false
    async function loadDetail() {
      try {
        setLoading(true)
        setError('')
        const res = await ftthApi.clusterDetail(id)
        if (!ignore) {
          setCluster(res)
          setStatusVal(res.status || 'running')
          const firstCat = res.categories_summary?.[0]?.name || 'Sitac'
          setActiveTab(firstCat)
        }
      } catch (err) {
        if (!ignore) setError(err.message || 'Gagal memuat detail cluster')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadDetail()
    return () => { ignore = true }
  }, [id])

  // Setup Leaflet Map for Cluster
  useEffect(() => {
    if (!mapRef.current || !cluster) return

    if (!mapInstance.current) {
      const lat = Number(cluster.latitude) || -6.9856
      const lng = Number(cluster.longitude) || 107.6042

      const map = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Add cluster polygon / boundary simulation (blue polygon from screenshot 2)
      const offset = 0.003
      const polygonCoords = [
        [lat - offset * 0.8, lng - offset],
        [lat - offset * 0.3, lng - offset * 1.2],
        [lat + offset * 0.6, lng - offset * 0.6],
        [lat + offset, lng + offset * 0.2],
        [lat + offset * 0.4, lng + offset * 1.1],
        [lat - offset * 0.5, lng + offset * 0.9],
      ]

      L.polygon(polygonCoords, {
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.25,
        weight: 2,
      }).addTo(map)

      // Center Pin
      const pinIcon = L.divIcon({
        className: 'custom-cluster-pin',
        html: '<div class="pin-marker-body"><div class="pin-marker-dot"></div></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      })

      const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map)
      marker.bindPopup(`<strong>${cluster.name}</strong><br/>Target HP: ${cluster.homepass_target}`)
      if (typeof marker.openPopup === 'function') marker.openPopup()

      mapInstance.current = map
    }

    setTimeout(() => mapInstance.current?.invalidateSize(), 200)
  }, [cluster])

  if (loading) {
    return (
      <div className="cluster-detail-container" role="status">
        <p>Memuat detail cluster…</p>
      </div>
    )
  }

  if (error || !cluster) {
    return (
      <div className="cluster-detail-container">
        <p className="ftth-error" role="alert">{error || 'Cluster tidak ditemukan.'}</p>
        <button type="button" className="view-detail-btn" onClick={() => navigate('/pegawai/clusters')}>
          ← Kembali ke daftar cluster
        </button>
      </div>
    )
  }

  const categories = cluster.categories_summary && cluster.categories_summary.length > 0
    ? cluster.categories_summary
    : [
        { id: 'sitac', name: 'Sitac', percentage: 13, completed: 1, total: 8, items: [] },
        { id: 'impl', name: 'Implementasi', percentage: 0, completed: 0, total: 6, items: [] },
        { id: 'ikr', name: 'IKR', percentage: 0, completed: 0, total: 5, items: [] },
      ]

  const activeCategory = categories.find((c) => c.name.toLowerCase() === activeTab.toLowerCase()) || categories[0]
  const targetHP = cluster.homepass_target || 555
  const achievedHP = cluster.homepass_achieved || 555
  const hpPct = targetHP > 0 ? Math.round((achievedHP / targetHP) * 100) : 100

  return (
    <div className="cluster-detail-container">
      {/* Breadcrumb */}
      <div className="cluster-breadcrumb">
        <Link to="/pegawai/projects">Projects</Link>
        <span>/</span>
        <Link to={`/pegawai/projects/${cluster.project_id}`}>{cluster.project_id || cluster.project_name}</Link>
        <span>/</span>
        <span className="active-crumb">{cluster.name}</span>
      </div>

      {/* Top Header Card */}
      <div className="cluster-detail-top-card">
        <div className="cluster-detail-title-row">
          <h1>{cluster.name}</h1>
          <select
            className="process-status-selector"
            value={statusVal}
            onChange={(e) => setStatusVal(e.target.value)}
            style={{ textTransform: 'capitalize' }}
          >
            <option value="running">Running</option>
            <option value="open">Open</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="cluster-detail-grid-top">
          {/* Map View */}
          <div className="cluster-detail-map-wrap">
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} id="cluster-detail-map" />
          </div>

          {/* Right Side Cards */}
          <div className="cluster-detail-side-cards">
            {/* Homepass Card */}
            <div className="cluster-side-box">
              <h3>Homepass</h3>
              <div className="homepass-numbers">
                <div className="homepass-num-item">
                  <small>Target</small>
                  <strong>{targetHP}</strong>
                </div>
                <div className="homepass-num-item" style={{ textAlign: 'right' }}>
                  <small>Achieved</small>
                  <strong>{achievedHP}</strong>
                </div>
              </div>
              <div className="homepass-bar-container">
                <div className="homepass-bar-track">
                  <div className="homepass-bar-fill" style={{ width: `${Math.min(100, hpPct)}%` }} />
                </div>
                <span className="homepass-bar-pct">{hpPct}%</span>
              </div>
            </div>

            {/* KMZ/KML File Card */}
            <div className="cluster-side-box">
              <h3>KMZ/KML File</h3>
              <div className="kmz-file-box">
                <div className="kmz-input-row">
                  <input type="file" style={{ fontSize: '0.8rem' }} />
                  <button type="button" className="kmz-replace-btn">Replace</button>
                </div>
                <div className="kmz-status-text">
                  <span>KMZ file uploaded and shown on map</span>
                  <button type="button" className="kmz-delete-btn">× Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Process Progress Section */}
      <div className="cluster-detail-progress-section">
        <div className="cluster-progress-label-row">
          <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>Process Progress</strong>
          <span style={{ fontSize: '1rem', fontWeight: 700 }}>{cluster.overall_progress || 4}%</span>
        </div>
        <div className="cluster-progress-track" style={{ height: '8px', margin: '8px 0 16px' }}>
          <div
            className="cluster-progress-fill"
            style={{ width: `${Math.min(100, cluster.overall_progress || 4)}%` }}
          />
        </div>

        {/* 3 Category summary boxes */}
        <div className="cluster-detail-cat-cards">
          {categories.map((cat) => (
            <div key={cat.id || cat.name} className="cluster-cat-summary-box">
              <span className="cluster-cat-summary-title">{cat.name}</span>
              <div className="cluster-progress-track" style={{ height: '6px' }}>
                <div
                  className="cluster-progress-fill"
                  style={{ width: `${Math.min(100, cat.percentage || 0)}%` }}
                />
              </div>
              <span className="cluster-cat-summary-count">{cat.completed}/{cat.total} completed</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="cluster-category-tabs">
        {categories.map((cat) => (
          <button
            key={cat.id || cat.name}
            type="button"
            className={`category-tab-btn ${activeTab.toLowerCase() === cat.name.toLowerCase() ? 'is-active' : ''}`}
            onClick={() => setActiveTab(cat.name)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Process items list under active category */}
      <div className="cluster-process-list">
        {activeCategory && activeCategory.items && activeCategory.items.length > 0 ? (
          activeCategory.items.map((item) => {
            const isDone = item.status === 'completed' || item.status === 'selesai'
            const isProgress = item.status === 'in_progress' || item.status === 'on_progress'
            const isKendala = item.status === 'kendala'

            return (
              <div key={item.id} className="cluster-process-card">
                <div className="cluster-process-header-row">
                  <div className="process-title-group">
                    <h3>
                      <span>{item.name}</span>
                      <span className={`process-status-tag ${isDone ? 'is-completed' : isProgress ? 'is-on_progress' : isKendala ? 'is-kendala' : 'is-pending'}`}>
                        • {isDone ? 'Completed' : isProgress ? 'On Progress' : isKendala ? 'Kendala' : 'Pending'}
                      </span>
                    </h3>
                    <p className="process-desc-text">
                      {item.input_instruction || `Pekerjaan ${item.name} untuk cluster ${cluster.name}`}
                    </p>
                    {item.completed_date && (
                      <p className="process-completed-text">
                        Completed: {new Intl.DateTimeFormat('en-US').format(new Date(item.completed_date))}
                      </p>
                    )}
                  </div>

                  <select
                    className="process-status-selector"
                    defaultValue={isDone ? 'completed' : isProgress ? 'on_progress' : isKendala ? 'kendala' : 'pending'}
                  >
                    <option value="pending">Pending</option>
                    <option value="on_progress">On Progress</option>
                    <option value="completed">Completed</option>
                    <option value="kendala">Kendala</option>
                  </select>
                </div>

                <div className="cluster-process-photo-section">
                  <div>
                    <strong>Foto</strong> <small>(JPG, JPEG, PNG)</small>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                      {item.reportCount > 0 ? `${item.reportCount} laporan telah dibuat untuk pekerjaan ini` : 'Belum ada bukti foto pekerjaan'}
                    </p>
                  </div>
                  <Link
                    to={`/pegawai/laporan/new?cluster_id=${cluster.id}&process_id=${item.process_id}`}
                    className="cluster-report-action-btn"
                  >
                    <Icon name="report" size={16} />
                    <span>Input Hasil Pekerjaan / Lapor</span>
                  </Link>
                </div>
              </div>
            )
          })
        ) : (
          <div className="cluster-process-card" style={{ textAlign: 'center', color: '#64748b' }}>
            Belum ada rincian pekerjaan pada kategori ini.
          </div>
        )}
      </div>
    </div>
  )
}
