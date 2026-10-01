import { useEffect, useState } from 'react'
import { ftthApi } from '../../api/ftth.js'
import FtthDialog from '../integration/FtthDialog.jsx'
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
        <h1>Project saya</h1>
        <p>Project yang memuat pekerjaan penugasan Anda.</p>
      </div>

      {error && <p className="ftth-error" role="alert">{error}</p>}
      {loading && <p role="status">Memuat data project…</p>}

      {!loading && !error && (
        <div className="table-responsive">
          <table className="employee-project-table">
            <thead>
              <tr>
                <th>Nama Project</th>
                <th className="record-secondary">No. SPK</th>
                <th className="record-secondary">Tgl SPK</th>
                <th className="record-secondary">Jumlah Cluster</th>
                <th className="record-secondary">Target Homepass</th>
                <th className="record-secondary">Homepass Tercapai</th>
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
                    <td><strong>{p.name}</strong><small className="mobile-record-meta">{p.cluster_count} cluster</small></td>
                    <td className="record-secondary">{p.spk_number}</td>
                    <td className="record-secondary">{p.spk_date}</td>
                    <td className="record-secondary">{p.cluster_count} cluster</td>
                    <td className="record-secondary">{p.homepass_target?.toLocaleString() ?? '—'}</td>
                    <td className="record-secondary">{p.homepass_achieved?.toLocaleString() ?? '—'}</td>
                    <td>
                      <span className={`status-badge is-${p.status || 'open'}`}>
                        {p.status || 'open'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="view-detail-btn"
                        disabled={detailLoading}
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
        <FtthDialog responsive title="Detail project" onClose={() => setSelectedProject(null)}>
            <div className="employee-modal-body">
              <h3>{selectedProject.name}</h3>
              <p><strong>Nomor SPK:</strong> {selectedProject.spk_number || '-'}</p>
              <p><strong>Tanggal SPK:</strong> {selectedProject.spk_date || '-'}</p>
              <p><strong>Estimasi Homepass:</strong> {selectedProject.estimated_homepass ?? '—'}</p>
              <p><strong>Deskripsi:</strong> {selectedProject.description || '-'}</p>

              <h4>
                Cluster dalam Project ({selectedProject.clusters?.length || 0})
              </h4>
              <div className="table-responsive">
                <table className="employee-project-clusters-table">
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
                          <td>{c.homepass_target ?? '—'}</td>
                          <td>{c.homepass_achieved ?? '—'}</td>
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
        </FtthDialog>
      )}
    </div>
  )
}
