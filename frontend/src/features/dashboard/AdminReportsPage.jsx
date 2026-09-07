import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../../api/dashboard.js'
import { updateReportStatus, deleteReport } from '../../api/reports.js'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import PageState from '../../components/PageState.jsx'
import Notice from '../../components/Notice.jsx'

const STATUS_LABELS = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
}

const STATUS_CLASS = {
  PENDING: 'pending',
  APPROVED: 'active',
  REJECTED: 'rejected',
}

export default function AdminReportsPage() {
  const [page, setPage] = useState(1)
  const limit = 20
  const [search, setSearch] = useState('')
  const [result, setResult] = useState({ items: [], total: 0 })
  const [state, setState] = useState('loading')
  const [actionLoading, setActionLoading] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    let active = true
    setState('loading')
    dashboardApi
      .listReports({ page, limit, search })
      .then((response) => {
        if (active) {
          setResult(response.data || response)
          setState('ready')
        }
      })
      .catch(() => {
        if (active) setState('error')
      })
    return () => {
      active = false
    }
  }, [page, search])

  async function handleApprove(reportId) {
    setActionLoading(reportId)
    setNotice(null)
    try {
      await updateReportStatus(reportId, 'APPROVED', 'Laporan disetujui.')
      setNotice({ tone: 'success', message: 'Laporan berhasil disetujui.' })
      setResult((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === reportId ? { ...item, status: 'APPROVED' } : item
        ),
      }))
    } catch (error) {
      setNotice({ tone: 'error', message: error.message || 'Gagal menyetujui laporan.' })
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(reportId) {
    const catatan = prompt('Masukkan catatan penolakan:')
    if (catatan === null) return
    setActionLoading(reportId)
    setNotice(null)
    try {
      await updateReportStatus(reportId, 'REJECTED', catatan)
      setNotice({ tone: 'success', message: 'Laporan ditolak.' })
      setResult((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === reportId ? { ...item, status: 'REJECTED' } : item
        ),
      }))
    } catch (error) {
      setNotice({ tone: 'error', message: error.message || 'Gagal menolak laporan.' })
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(reportId) {
    if (!confirm('Yakin ingin menghapus laporan ini?')) return
    setActionLoading(reportId)
    setNotice(null)
    try {
      await deleteReport(reportId)
      setNotice({ tone: 'success', message: 'Laporan berhasil dihapus.' })
      setResult((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== reportId),
        total: prev.total - 1,
      }))
    } catch (error) {
      setNotice({ tone: 'error', message: error.message || 'Gagal menghapus laporan.' })
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = Math.max(
    1,
    Math.ceil(result.total / (result.limit || limit)),
  )

  return (
    <section className="page">
      <PageHeader
        title="Laporan"
        description="Seluruh laporan kegiatan harian pegawai yang tercatat pada sistem."
      />
      {notice && <Notice tone={notice.tone}>{notice.message}</Notice>}
      <section className="filter-bar" aria-label="Pencarian laporan">
        <label htmlFor="report-search">
          Cari laporan
          <input
            id="report-search"
            type="search"
            placeholder="Pegawai, project, cluster, atau pekerjaan..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </label>
      </section>
      <section className="data-section table-panel">
        <div className="section-heading">
          <div>
            <h2>Daftar laporan</h2>
            <p>{result.total} total laporan tersimpan</p>
          </div>
        </div>
        {state === 'error' ? (
          <PageState
            tone="error"
            title="Laporan tidak dapat dimuat"
            message="Periksa koneksi server, lalu coba kembali."
          />
        ) : (
          <div
            className={`table-wrap ${state === 'loading' ? 'is-loading' : ''}`}
          >
            <table>
              <caption className="sr-only">Daftar seluruh laporan</caption>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Pegawai</th>
                  <th>Project</th>
                  <th>Cluster</th>
                  <th>Pekerjaan</th>
                  <th>Status</th>
                  <th>Keterangan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.id}>
                    <td>{String(item.tanggal_kegiatan || item.tanggalKegiatan || '').slice(0, 10)}</td>
                    <td>
                      <strong>{item.user?.nama || item.user?.name || '-'}</strong>
                      {item.user?.nomorHp && <small className="table-subline">{item.user.nomorHp}</small>}
                    </td>
                    <td>{item.project?.name || item.project_name || '-'}</td>
                    <td>{item.cluster?.name || item.cluster_name || '-'}</td>
                    <td>{item.process?.name || item.master_process?.name || item.pekerjaan?.namaPekerjaan || '-'}</td>
                    <td>
                      <span className={`status-badge ${STATUS_CLASS[item.status] || 'pending'}`}>
                        {STATUS_LABELS[item.status] || item.status || 'Menunggu'}
                      </span>
                    </td>
                    <td className="description-cell">{item.keterangan}</td>
                    <td>
                      <div className="table-actions">
                        <Link
                          className="table-link"
                          to={`/admin/laporan/${item.id}`}
                        >
                          Detail <Icon name="chevronRight" size={16} />
                        </Link>
                        {item.status === 'PENDING' && (
                          <>
                            <button
                              className="table-action approve"
                              onClick={() => handleApprove(item.id)}
                              disabled={actionLoading === item.id}
                              title="Setujui"
                            >
                              ✓
                            </button>
                            <button
                              className="table-action reject"
                              onClick={() => handleReject(item.id)}
                              disabled={actionLoading === item.id}
                              title="Tolak"
                            >
                              ✗
                            </button>
                          </>
                        )}
                        <button
                          className="table-action delete"
                          onClick={() => handleDelete(item.id)}
                          disabled={actionLoading === item.id}
                          title="Hapus"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {result.items.length === 0 && state !== 'loading' && (
                  <tr>
                    <td className="empty-cell" colSpan="8">
                      Belum ada laporan yang tercatat pada sistem.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {state === 'loading' && (
              <div className="table-loading" role="status">
                Memuat laporan...
              </div>
            )}
          </div>
        )}
        <div className="pagination">
          <button
            className="secondary-button"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Sebelumnya
          </button>
          <span>
            Halaman {page} dari {totalPages}
          </span>
          <button
            className="secondary-button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Berikutnya
          </button>
        </div>
      </section>
    </section>
  )
}