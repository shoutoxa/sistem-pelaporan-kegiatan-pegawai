import { useEffect, useState } from 'react'
import { ftthApi } from '../../api/ftth.js'
import './employee-dashboard.css'

export default function EmployeeHomepassPage() {
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    async function loadData() {
      try {
        setLoading(true)
        setError('')
        const data = await ftthApi.clusters()
        if (!ignore) setClusters(data)
      } catch (err) {
        if (!ignore) setError(err.message || 'Gagal memuat data homepass')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadData()
    return () => { ignore = true }
  }, [])

  const totalTarget = clusters.some((c) => c.homepass_target == null) ? null : clusters.reduce((acc, c) => acc + Number(c.homepass_target), 0)
  const totalAchieved = clusters.some((c) => c.homepass_achieved == null) ? null : clusters.reduce((acc, c) => acc + Number(c.homepass_achieved), 0)
  const totalPct = totalTarget > 0 && totalAchieved != null ? Math.round((totalAchieved / totalTarget) * 100) : null

  return (
    <div className="employee-view-page">
      <div className="dashboard-header">
        <h1>Homepass Tracking</h1>
        <p>Pemantauan target dan realisasi homepass pada cluster penugasan Anda.</p>
      </div>

      {error && <p className="ftth-error" role="alert">{error}</p>}
      {loading && <p role="status">Memuat data homepass…</p>}

      {!loading && !error && (
        <>
          <div className="stat-cards-grid homepass-stats-grid">
            <div className="dashboard-stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label">Total Target Homepass</span>
                <span className="stat-card-value">{totalTarget?.toLocaleString() ?? '—'}</span>
              </div>
            </div>
            <div className="dashboard-stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label">Total Homepass Tercapai</span>
                <span className="stat-card-value">{totalAchieved?.toLocaleString() ?? '—'}</span>
              </div>
            </div>
            <div className="dashboard-stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label">Rata-rata Pencapaian</span>
                <span className="stat-card-value">{totalPct == null ? '—' : `${totalPct}%`}</span>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="employee-homepass-table">
              <thead>
                <tr>
                  <th>Nama Cluster</th>
                  <th className="record-secondary">Project</th>
                  <th><span className="desktop-record-label">Target Homepass</span><span className="mobile-record-meta">Target HP</span></th>
                  <th><span className="desktop-record-label">Homepass Tercapai</span><span className="mobile-record-meta">Tercapai HP</span></th>
                  <th className="record-secondary" style={{ width: '25%' }}>Progres</th>
                  <th className="record-secondary">Status</th>
                </tr>
              </thead>
              <tbody>
                {clusters.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                      Belum ada data homepass.
                    </td>
                  </tr>
                ) : (
                  clusters.map((c) => {
                    const target = c.homepass_target
                    const achieved = c.homepass_achieved
                    const pct = target > 0 && achieved != null ? Math.round((achieved / target) * 100) : null

                    return (
                      <tr key={c.id}>
                        <td><strong>{c.name}</strong><div className="mobile-record-meta"><span>{c.project_name || '—'}</span>
                          <span>Progres: {pct == null ? '—' : `${pct}%`} · {c.status || 'open'}</span></div></td>
                        <td className="record-secondary">{c.project_name || '-'}</td>
                        <td>{target?.toLocaleString() ?? '—'}</td>
                        <td>{achieved?.toLocaleString() ?? '—'}</td>
                        <td className="record-secondary">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="process-bar-track" style={{ flex: 1, height: '10px' }}>
                              <div
                                className="process-bar-fill"
                                style={{
                                  width: `${Math.min(100, Math.max(0, pct))}%`,
                                  backgroundColor: pct >= 100 ? 'var(--success)' : 'var(--brand)',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '35px' }}>{pct == null ? '—' : `${pct}%`}</span>
                          </div>
                        </td>
                        <td className="record-secondary">
                          <span className={`status-badge is-${c.status || 'open'}`}>
                            {c.status || 'open'}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
