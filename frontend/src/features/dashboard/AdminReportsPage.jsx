import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../../api/dashboard.js'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import PageState from '../../components/PageState.jsx'
import FtthReportPanel from '../integration/FtthReportPanel.jsx'

const STATUS_LABELS = {
  ALL: 'Semua Status',
  ON_PROGRESS: 'On Progress',
  SELESAI: 'Selesai',
  KENDALA: 'Kendala',
  APPROVED: 'Diterima',
  REJECTED: 'Perlu revisi',
  PENDING: 'Menunggu',
}

function renderStatusBadge(item) {
  const status = item.status || (item.diterima ? 'APPROVED' : 'PENDING')
  let badgeClass = 'pending'
  let label = STATUS_LABELS[status] || status
  if (status === 'SELESAI' || status === 'APPROVED') {
    badgeClass = 'active'
    label = status === 'SELESAI' ? 'Selesai' : 'Diterima'
  } else if (status === 'KENDALA' || status === 'REJECTED') {
    badgeClass = 'inactive'
    label = status === 'KENDALA' ? 'Kendala' : 'Perlu revisi'
  } else if (status === 'ON_PROGRESS') {
    badgeClass = 'info'
    label = 'On Progress'
  }
  return <span className={`status-badge ${badgeClass}`}>{label}</span>
}

export default function AdminReportsPage() {
  const [page, setPage] = useState(1)
  const limit = 20
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [result, setResult] = useState({ items: [], total: 0 })
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setState('loading')
    dashboardApi
      .listReports({ page, limit, search, status })
      .then((response) => {
        if (active) {
          setResult(response.data)
          setState('ready')
        }
      })
      .catch((error) => {
        if (active) { setState('error'); setError(error.message) }
      })
    return () => {
      active = false
    }
  }, [page, search, status, reload])

  const totalPages = Math.max(
    1,
    Math.ceil(result.total / (result.limit || limit)),
  )

  return (
    <section className="page admin-reports-page">
      <PageHeader
        title="Laporan"
        description="Seluruh laporan kegiatan harian pegawai yang tercatat pada sistem."
      />
      <section className="filter-bar report-search-bar" aria-label="Pencarian laporan">
        <label htmlFor="report-search">
          Cari laporan
          <input
            id="report-search"
            type="search"
            placeholder="Pegawai, project/cluster, pekerjaan, atau kendala..."
            maxLength={200}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </label>
        <label htmlFor="status-filter">
          Status
          <select
            id="status-filter"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="ALL">Semua Status</option>
            <option value="ON_PROGRESS">On Progress</option>
            <option value="SELESAI">Selesai</option>
            <option value="KENDALA">Kendala</option>
            <option value="APPROVED">Diterima</option>
            <option value="REJECTED">Perlu revisi</option>
            <option value="PENDING">Menunggu</option>
          </select>
        </label>
        <button className="secondary-button" disabled={state === 'loading'} onClick={() => setReload((value) => value + 1)}><Icon name="refresh" size={18} />Muat ulang</button>
      </section>
      {selected && <FtthReportPanel key={selected} id={selected} onClose={() => setSelected(null)} onChanged={() => setReload((value) => value + 1)} />}
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
            message={error || 'Periksa koneksi server, lalu coba kembali.'}
          />
        ) : (
          <div
            className={`table-wrap ${state === 'loading' ? 'is-loading' : ''}`}
          >
            <table className="responsive-records">
              <caption className="sr-only">Daftar seluruh laporan</caption>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Pegawai</th>
                  <th>Lokasi</th>
                  <th>Pekerjaan</th>
                  <th>Status</th>
                  <th>Kendala Laporan / Keterangan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.id}>
                    <td className="date-cell" data-label="Tanggal">{String(item.tanggalKegiatan).slice(0, 10)}</td>
                    <td data-label="Pegawai">
                      <strong>{item.user?.nama || '-'}</strong>
                      {item.user?.nomorHp && <small className="table-subline">{item.user.nomorHp}</small>}
                    </td>
                    <td className="location-cell" data-label="Lokasi">
                      <span>{item.cluster?.desa?.namaDesa || '-'}</span>
                      <small className="table-subline">{item.cluster?.clusterName || '-'}</small>
                    </td>
                    <td data-label="Pekerjaan">{item.pekerjaan?.namaPekerjaan || '-'}</td>
                    <td data-label="Status">
                      {renderStatusBadge(item)}
                    </td>
                    <td className="description-cell" data-label="Kendala Laporan / Keterangan">
                      {item.status === 'KENDALA' && <strong className="text-danger" style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Kendala Lapangan</strong>}
                      {item.kendala_lapangan || item.keterangan || '-'}
                    </td>
                    <td className="record-actions">
                      {result.source === 'ftth' ? <button className="secondary-button" onClick={() => setSelected(item.id)}>Detail</button> : <Link
                        className="table-link"
                        to={`/admin/laporan/${item.id}`}
                      >
                        Detail <Icon name="chevronRight" size={16} />
                      </Link>}
                    </td>
                  </tr>
                ))}
                {result.items.length === 0 && state !== 'loading' && (
                  <tr>
                    <td className="empty-cell" colSpan="7">
                      {search ? 'Tidak ada laporan yang cocok. Coba nama pegawai, lokasi, atau pekerjaan lain.' : 'Belum ada laporan yang tercatat pada sistem.'}
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
            disabled={state === 'loading' || page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Sebelumnya
          </button>
          <span>
            Halaman {page} dari {totalPages}
          </span>
          <button
            className="secondary-button"
            disabled={state === 'loading' || page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Berikutnya
          </button>
        </div>
      </section>
    </section>
  )
}
