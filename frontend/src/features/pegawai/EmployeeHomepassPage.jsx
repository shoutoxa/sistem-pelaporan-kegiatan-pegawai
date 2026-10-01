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

  const totalTarget = clusters.reduce((acc, c) => acc + (Number(c.homepass_target) || 0), 0)
  const totalAchieved = clusters.reduce((acc, c) => acc + (Number(c.homepass_achieved) || 0), 0)
  const totalPct = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0

  return (
    <div className="employee-view-page">
      <div className="dashboard-header">
        <h1>Homepass Tracking</h1>
        <p>Pemantauan target dan realisasi homepass seluruh cluster (Mode Tinjau)</p>
      </div>

      {error && <p className="ftth-error" role="alert">{error}</p>}
      {loading && <p role="status">Memuat data homepass…</p>}

      {!loading && !error && (
        <>
          <div className="stat-cards-grid" style={{ marginBottom: '24px' }}>
            <div className="dashboard-stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label">Total Target Homepass</span>
                <span className="stat-card-value">{totalTarget.toLocaleString()}</span>
              </div>
            </div>
            <div className="dashboard-stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label">Total Homepass Tercapai</span>
                <span className="stat-card-value">{totalAchieved.toLocaleString()}</span>
              </div>
            </div>
            <div className="dashboard-stat-card">
              <div className="stat-card-info">
                <span className="stat-card-label">Rata-rata Pencapaian</span>
                <span className="stat-card-value">{totalPct}%</span>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Nama Cluster</th>
                  <th>Project</th>
                  <th>Target Homepass</th>
                  <th>Homepass Tercapai</th>
                  <th style={{ width: '25%' }}>Progres</th>
                  <th>Status</th>
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
                    const target = Number(c.homepass_target) || 0
                    const achieved = Number(c.homepass_achieved) || 0
                    const pct = target > 0 ? Math.round((achieved / target) * 100) : (achieved > 0 ? 100 : 0)

                    return (
                      <tr key={c.id}>
                        <td><strong>{c.name}</strong></td>
                        <td>{c.project_name || '-'}</td>
                        <td>{target.toLocaleString()}</td>
                        <td>{achieved.toLocaleString()}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="process-bar-track" style={{ flex: 1, height: '10px' }}>
                              <div
                                className="process-bar-fill"
                                style={{
                                  width: `${Math.min(100, Math.max(0, pct))}%`,
                                  backgroundColor: pct >= 100 ? '#16a34a' : '#2563eb',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '35px' }}>{pct}%</span>
                          </div>
                        </td>
                        <td>
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
