import { useEffect, useState } from 'react'
import { ftthApi } from '../../api/ftth.js'
import Icon from '../../components/Icon.jsx'
import './employee-dashboard.css'

export default function EmployeeProjectsPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProject, setSelectedProject] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    let ignore = false
    async function loadProjects() {
      try {
        setLoading(true)
        setError('')
        const data = await ftthApi.projects()
        if (!ignore) setProjects(data)
      } catch (err) {
        if (!ignore) setError(err.message || 'Gagal memuat daftar project')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadProjects()
    return () => { ignore = true }
  }, [])

  async function openDetail(id) {
    try {
      setDetailLoading(true)
      const detail = await ftthApi.projectDetail(id)
      setSelectedProject(detail)
    } catch (err) {
      alert(err.message || 'Gagal memuat detail project')
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="employee-view-page">
      <div className="dashboard-header">
        <h1>All Projects</h1>
        <p>Daftar seluruh project FTTH aktif (Mode Tinjau)</p>
      </div>

      {error && <p className="ftth-error" role="alert">{error}</p>}
      {loading && <p role="status">Memuat data project…</p>}

      {!loading && !error && (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Nama Project</th>
                <th>No. SPK</th>
                <th>Tgl SPK</th>
                <th>Jumlah Cluster</th>
                <th>Target Homepass</th>
                <th>Homepass Tercapai</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>
                    Belum ada data project.
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.spk_number}</td>
                    <td>{p.spk_date}</td>
                    <td>{p.cluster_count} cluster</td>
                    <td>{p.homepass_target.toLocaleString()}</td>
                    <td>{p.homepass_achieved.toLocaleString()}</td>
                    <td>
                      <span className={`status-badge is-${p.status || 'open'}`}>
                        {p.status || 'open'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="view-detail-btn"
                        onClick={() => openDetail(p.id)}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Detail Project */}
      {selectedProject && (
        <div className="employee-modal-overlay" onClick={() => setSelectedProject(null)}>
          <div className="employee-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="employee-modal-header">
              <h3>Detail Project: {selectedProject.name || selectedProject.project_name}</h3>
              <button
                type="button"
                className="view-detail-btn"
                onClick={() => setSelectedProject(null)}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="employee-modal-body">
              <p><strong>Nomor SPK:</strong> {selectedProject.spk_number || '-'}</p>
              <p><strong>Tanggal SPK:</strong> {selectedProject.spk_date || '-'}</p>
              <p><strong>Estimasi Homepass:</strong> {selectedProject.estimated_homepass || '-'}</p>
              <p><strong>Deskripsi:</strong> {selectedProject.description || '-'}</p>

              <h4 style={{ margin: '20px 0 10px', fontSize: '1rem', color: '#0f172a' }}>
                Cluster dalam Project ({selectedProject.clusters?.length || 0})
              </h4>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Nama Cluster</th>
                      <th>Target HP</th>
                      <th>Tercapai HP</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!selectedProject.clusters?.length ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center' }}>Tidak ada cluster.</td>
                      </tr>
                    ) : (
                      selectedProject.clusters.map((c) => (
                        <tr key={c.id}>
                          <td>{c.name}</td>
                          <td>{c.homepass_target || 0}</td>
                          <td>{c.homepass_achieved || 0}</td>
                          <td>
                            <span className={`status-badge is-${c.status || 'open'}`}>
                              {c.status || 'open'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="employee-modal-footer">
              <button
                type="button"
                className="view-detail-btn"
                onClick={() => setSelectedProject(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
