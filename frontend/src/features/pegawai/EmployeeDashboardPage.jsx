import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ftthApi } from '../../api/ftth.js'
import Icon from '../../components/Icon.jsx'
import './employee-dashboard.css'

export default function EmployeeDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fullMap, setFullMap] = useState(false)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    let ignore = false
    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')
        const res = await ftthApi.dashboard()
        if (!ignore) {
          setData(res)
        }
      } catch (err) {
        if (!ignore) setError(err.message || 'Gagal memuat dashboard')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadDashboard()
    return () => { ignore = true }
  }, [])

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapRef.current || !data) return

    if (!mapInstance.current) {
      // Default center Indonesia
      const initialMap = L.map(mapRef.current, {
        center: [-2.5489, 118.0149],
        zoom: 5,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(initialMap)

      mapInstance.current = initialMap
    }

    const map = mapInstance.current
    // Clear previous markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer)
      }
    })

    const bounds = []
    const pinIcon = L.divIcon({
      className: 'custom-cluster-pin',
      html: '<div class="pin-marker-body"><div class="pin-marker-dot"></div></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
    })

    if (data.clusters && data.clusters.length > 0) {
      data.clusters.forEach((cluster) => {
        const lat = Number(cluster.latitude)
        const lng = Number(cluster.longitude)
        if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
          const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map)
          marker.bindPopup(`
            <div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
              <strong style="color: #0f172a; font-size: 14px;">${cluster.name}</strong><br/>
              <span style="color: #64748b;">Proyek: ${cluster.project_name || '-'}</span><br/>
              <span>Target HP: <strong>${cluster.homepass_target || 0}</strong></span><br/>
              <span>Status: <strong style="text-transform: capitalize;">${cluster.status || 'open'}</strong></span>
            </div>
          `)
          bounds.push([lat, lng])
        }
      })
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
    }

    // Leaflet needs resize invalidation
    setTimeout(() => map.invalidateSize(), 200)

    return () => {
      // Don't destroy immediately on every render to keep smooth transitions
    }
  }, [data, fullMap])

  if (loading) {
    return (
      <div className="employee-dashboard-layout" role="status">
        <p>Memuat ringkasan proyek dan progres...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="employee-dashboard-layout">
        <p className="ftth-error" role="alert">{error}</p>
      </div>
    )
  }

  const {
    totalProjects = 0,
    totalClusters = 0,
    homepassTarget = 0,
    overallProgress = 0,
    processProgress = [],
    reportStats = { onProgress: 0, selesai: 0, kendala: 0, total: 0 },
  } = data || {}

  return (
    <div className="employee-dashboard-layout">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Overview of all projects and progress</p>
      </div>

      {/* 4 Stat Cards */}
      <div className="stat-cards-grid">
        <div className="dashboard-stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Total Projects</span>
            <span className="stat-card-value">{totalProjects}</span>
          </div>
          <div className="stat-card-icon-wrap is-blue">
            <Icon name="folder" size={24} />
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Total Clusters</span>
            <span className="stat-card-value">{totalClusters}</span>
          </div>
          <div className="stat-card-icon-wrap is-teal">
            <Icon name="database" size={24} />
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Homepass Target</span>
            <span className="stat-card-value">{homepassTarget.toLocaleString()}</span>
          </div>
          <div className="stat-card-icon-wrap is-cyan">
            <Icon name="home" size={24} />
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Overall Progress</span>
            <span className="stat-card-value">{overallProgress}%</span>
          </div>
          <div className="stat-card-icon-wrap is-purple">
            <Icon name="chart" size={24} />
          </div>
        </div>
      </div>

      {/* Cluster Location Map */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <h2>Cluster Location Map</h2>
          <button
            type="button"
            className="card-action-link"
            onClick={() => setFullMap(!fullMap)}
          >
            {fullMap ? 'Collapse map' : 'Open full map →'}
          </button>
        </div>
        <div className="leaflet-map-wrapper" style={{ height: fullMap ? '580px' : '380px' }}>
          <div ref={mapRef} className="map-container-elem" id="cluster-map-container" />
        </div>
      </div>

      {/* Process Progress */}
      <div className="process-progress-section">
        <h2>Process Progress</h2>
        {processProgress.length === 0 ? (
          <p className="ftth-helper">Belum ada progres pekerjaan cluster.</p>
        ) : (
          <div className="process-progress-grid">
            {processProgress.map((p) => (
              <div key={p.id} className="process-item">
                <div className="process-label-row">
                  <span>{p.name}</span>
                  <span className="process-pct">{p.percentage}%</span>
                </div>
                <div className="process-bar-track">
                  <div
                    className="process-bar-fill"
                    style={{ width: `${Math.min(100, Math.max(0, p.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stat Laporan Harian Pegawai */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <h2>Statistik Laporan Harian Saya</h2>
          <a href="/pegawai/histori" className="card-action-link">Lihat semua laporan →</a>
        </div>
        <div className="daily-report-stats-grid">
          <div className="report-stat-box is-progress">
            <span className="report-stat-title">On Progress</span>
            <span className="report-stat-count">{reportStats.onProgress}</span>
            <small>Pekerjaan sedang berjalan</small>
          </div>
          <div className="report-stat-box is-selesai">
            <span className="report-stat-title">Selesai</span>
            <span className="report-stat-count">{reportStats.selesai}</span>
            <small>Telah masuk Cluster Project</small>
          </div>
          <div className="report-stat-box is-kendala">
            <span className="report-stat-title">Kendala</span>
            <span className="report-stat-count">{reportStats.kendala}</span>
            <small>Menunggu penanganan lapangan</small>
          </div>
        </div>
      </div>
    </div>
  )
}
