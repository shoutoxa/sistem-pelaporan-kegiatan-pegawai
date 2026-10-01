import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ftthApi } from '../../api/ftth.js'
import Icon from '../../components/Icon.jsx'
import './employee-dashboard.css'

export default function EmployeeClustersPage() {
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let ignore = false
    async function loadClusters() {
      try {
        setLoading(true)
        setError('')
        const data = await ftthApi.clusters()
        if (!ignore) setClusters(data)
      } catch (err) {
        if (!ignore) setError(err.message || 'Gagal memuat daftar cluster')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadClusters()
    return () => { ignore = true }
  }, [])

  function getDotClass(status) {
    const s = String(status || '').toLowerCase()
    if (s === 'completed' || s === 'selesai') return 'is-completed'
    if (s === 'in_progress' || s === 'on_progress' || s === 'running') return 'is-progress'
    return 'is-pending'
  }

  return (
    <div className="employee-view-page">
      <div className="dashboard-header">
        <h1>Clusters</h1>
        <p>Ringkasan progres pekerjaan dan target homepass per cluster</p>
      </div>

      {error && <p className="ftth-error" role="alert">{error}</p>}
      {loading && <p role="status">Memuat data cluster…</p>}

      {!loading && !error && (
        <div className="clusters-cards-grid">
          {clusters.length === 0 ? (
            <p className="ftth-helper">Belum ada data cluster yang tersedia.</p>
          ) : (
            clusters.map((c, index) => {
              const isRunning = c.status === 'running' || c.overall_progress > 0
              const categories = c.categories_summary || []

              return (
                <div
                  key={c.id}
                  className={`cluster-overview-card ${index === 0 ? 'is-active-border' : ''}`}
                  onClick={() => navigate(`/pegawai/clusters/${c.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/pegawai/clusters/${c.id}`) }}
                >
                  <div className="cluster-card-top">
                    <h3 className="cluster-card-title">{c.name}</h3>
                    <div className="cluster-badges">
                      <span className="cluster-badge is-readonly"><Icon name="eye" size={12} /> Penugasan saya</span>
                      <span className={`cluster-badge ${isRunning ? 'is-running' : 'is-open'}`}>
                        {isRunning ? 'running' : (c.status || 'open')}
                      </span>
                    </div>
                  </div>

                  <div className="cluster-card-subtitle">
                    {c.description || c.project_name || 'FTTH OPEN AREA'}
                  </div>

                  {/* Overall Progress */}
                  <div className="cluster-card-overall-progress">
                    <div className="cluster-progress-label-row">
                      <span>Overall Progress</span>
                      <span>{c.overall_progress || 0}%</span>
                    </div>
                    <div className="cluster-progress-track">
                      <div
                        className="cluster-progress-fill"
                        style={{ width: `${Math.min(100, Math.max(0, c.overall_progress || 0))}%` }}
                      />
                    </div>
                  </div>

                  {/* Category Progress Rows */}
                  <div className="cluster-card-cat-rows">
                    {categories.map((cat) => (
                      <div key={cat.id || cat.name} className="cluster-cat-row">
                        <span className="cluster-cat-name">{cat.name}</span>
                        <span className="cluster-cat-pct">
                          {cat.percentage}% ({cat.completed}/{cat.total})
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 3 Column Task Grid */}
                  <div className="cluster-card-columns">
                    {categories.map((cat) => (
                      <div key={cat.id || cat.name} className="cluster-column">
                        <h4>{cat.name}</h4>
                        <ul className="cluster-task-list">
                          {cat.items && cat.items.length > 0 ? (
                            cat.items.map((item) => (
                              <li key={item.id} className="cluster-task-item">
                                <span className={`cluster-task-dot ${getDotClass(item.status)}`} />
                                <div className="cluster-task-info">
                                  <span className="cluster-task-name">{item.name}</span>
                                  {item.date && (
                                    <span className="cluster-task-date">
                                      {new Intl.DateTimeFormat('en-US').format(new Date(item.date))}
                                    </span>
                                  )}
                                </div>
                              </li>
                            ))
                          ) : (
                            <li className="cluster-task-item ftth-helper" style={{ fontSize: '0.7rem' }}>
                              Tidak ada rincian
                            </li>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Footer HP */}
                  <div className="cluster-card-footer">
                    <Icon name="home" size={15} />
                    <span>HP: {c.homepass_achieved ?? '—'} / {c.homepass_target ?? '—'}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
