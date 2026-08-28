import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../../api/dashboard.js'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import PageState from '../../components/PageState.jsx'

export default function AdminReportsPage() {
  const [page, setPage] = useState(1)
  const limit = 20
  const [search, setSearch] = useState('')
  const [result, setResult] = useState({ items: [], total: 0 })
  const [state, setState] = useState('loading')

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
      .catch(() => {
        if (active) setState('error')
      })
    return () => {
      active = false
    }
  }, [page, search])

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
      <section className="filter-bar" aria-label="Pencarian laporan">
        <label htmlFor="report-search">
          Cari laporan
          <input
            id="report-search"
            type="search"
            placeholder="Pegawai, lokasi/RW, atau pekerjaan..."
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
                      <span className={`status-badge ${item.diterima ? 'active' : 'pending'}`}>
                        {item.diterima ? 'Diterima' : 'Menunggu'}
                      </span>
                    </td>
                    <td className="description-cell">{item.keterangan}</td>
                    <td>
                      <Link
                        className="table-link"
                        to={`/admin/laporan/${item.id}`}
                      >
                        Detail <Icon name="chevronRight" size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {result.items.length === 0 && state !== 'loading' && (
                  <tr>
                    <td className="empty-cell" colSpan="7">
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
