import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../../api/dashboard.js'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import PageState from '../../components/PageState.jsx'
import FtthReportPanel from '../integration/FtthReportPanel.jsx'

export default function AdminReportsPage() {
  const [page, setPage] = useState(1)
  const limit = 20
  const [search, setSearch] = useState('')
  const [result, setResult] = useState({ items: [], total: 0 })
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setState('loading')
    dashboardApi
      .listReports({ page, limit, search })
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
  }, [page, search, reload])

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
      {result.source === 'ftth' && <p className="notice">Sumber: API perusahaan. Laporan lokal lama tetap tersimpan terpisah.</p>}
      <section className="filter-bar report-search-bar" aria-label="Pencarian laporan">
        <label htmlFor="report-search">
          Cari laporan
          <input
            id="report-search"
            type="search"
            placeholder="Pegawai, project/cluster, atau pekerjaan..."
            maxLength={200}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
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
            <table>
              <caption className="sr-only">Daftar seluruh laporan</caption>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Pegawai</th>
                  <th>Lokasi</th>
                  <th>Pekerjaan</th>
                  <th>Status</th>
                  <th>Keterangan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.id}>
                    <td>{String(item.tanggalKegiatan).slice(0, 10)}</td>
                    <td>
                      <strong>{item.user?.nama || '-'}</strong>
                      {item.user?.nomorHp && <small className="table-subline">{item.user.nomorHp}</small>}
                    </td>
                    <td>
                      {item.cluster?.desa?.namaDesa || '-'} ·{' '}
                      {item.cluster?.clusterName || '-'}
                    </td>
                    <td>{item.pekerjaan?.namaPekerjaan || '-'}</td>
                    <td>
                      <span className={`status-badge ${item.status === 'REJECTED' ? 'inactive' : item.diterima ? 'active' : 'pending'}`}>
                        {item.status === 'REJECTED' ? 'Perlu revisi' : item.diterima ? 'Diterima' : 'Menunggu'}
                      </span>
                    </td>
                    <td className="description-cell">{item.keterangan}</td>
                    <td>
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
