import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../../api/dashboard.js'
import { masterApi } from '../../api/master.js'
import PageHeader from '../../components/PageHeader.jsx'
import PageState from '../../components/PageState.jsx'
import Icon from '../../components/Icon.jsx'

const POLL_MS = 30_000

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const [filters, setFilters] = useState({
    date: '',
    desaId: '',
    pekerjaanId: '',
    search: '',
  })
  const [options, setOptions] = useState({
    villages: [],
    jobs: [],
  })

  useEffect(() => {
    Promise.all([masterApi.fetchDesa(), masterApi.fetchPekerjaan()])
      .then(([villages, jobs]) => {
        setOptions({
          villages: Array.isArray(villages) ? villages : [],
          jobs: Array.isArray(jobs) ? jobs : [],
        })
      })
      .catch(() => {})
  }, [])

  const refresh = useCallback(() => {
    setState((current) => (current === 'ready' ? 'refreshing' : 'loading'))
    const query = {
      ...(filters.date ? { date: filters.date } : {}),
      ...(filters.desaId ? { desaId: filters.desaId } : {}),
      ...(filters.pekerjaanId ? { pekerjaanId: filters.pekerjaanId } : {}),
      ...(filters.search ? { search: filters.search } : {}),
    }
    return dashboardApi
      .get(query)
      .then((response) => {
        setData(response.data)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [filters])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const resetFilters = () => {
    setFilters({
      date: '',
      desaId: '',
      pekerjaanId: '',
      search: '',
    })
  }

  const hasCustomFilters = Boolean(
    filters.desaId || filters.pekerjaanId || filters.search || filters.date,
  )

  if (state === 'loading' && !data)
    return (
      <section className="page">
        <PageState
          title="Menyiapkan dashboard"
          message="Mengambil ringkasan data laporan terbaru."
        />
      </section>
    )

  if (state === 'error' && !data)
    return (
      <section className="page">
        <PageState
          tone="error"
          title="Dashboard tidak dapat dimuat"
          message="Periksa koneksi server, lalu coba kembali."
          action={
            <button className="secondary-button" onClick={refresh}>
              Coba lagi
            </button>
          }
        />
      </section>
    )

  const highestVillage = Math.max(
    1,
    ...(data?.distribusiDesa || []).map((item) => item.jumlah),
  )
  const highestJob = Math.max(
    1,
    ...(data?.distribusiPekerjaan || []).map((item) => item.jumlah),
  )

  const labelDate = data?.tanggal || data?.targetDate || 'hari ini'

  return (
    <section className="page dashboard-page">
      <PageHeader
        title="Dashboard"
        description="Ringkasan dan pemantauan progres kegiatan lapangan secara menyeluruh."
        action={
          <div className="dashboard-controls">
            <button
              className="secondary-button icon-label"
              onClick={refresh}
              disabled={state === 'refreshing'}
            >
              <Icon name="refresh" />
              {state === 'refreshing' ? 'Memuat...' : 'Muat ulang'}
            </button>
          </div>
        }
      />

      <section className="filter-bar" aria-label="Filter dashboard">
        <div className="filter-fields">
          <label htmlFor="dashboard-search">
            Cari Keterangan / PIC
            <input
              id="dashboard-search"
              type="text"
              placeholder="Kata kunci..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </label>
          <label htmlFor="dashboard-desa">
            Cluster / Desa
            <select
              id="dashboard-desa"
              aria-label="Cluster / Desa"
              value={filters.desaId}
              onChange={(e) => updateFilter('desaId', e.target.value)}
            >
              <option value="">Semua Cluster / Desa</option>
              {options.villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.namaDesa}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="dashboard-pekerjaan">
            Pekerjaan
            <select
              id="dashboard-pekerjaan"
              aria-label="Pekerjaan"
              value={filters.pekerjaanId}
              onChange={(e) => updateFilter('pekerjaanId', e.target.value)}
            >
              <option value="">Semua Pekerjaan</option>
              {options.jobs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.namaPekerjaan}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="dashboard-date">
            Tanggal
            <input
              id="dashboard-date"
              type="date"
              value={filters.date}
              onChange={(e) => updateFilter('date', e.target.value)}
            />
          </label>
        </div>
        {hasCustomFilters && (
          <button className="text-button" type="button" onClick={resetFilters}>
            Reset filter (Semua data)
          </button>
        )}
      </section>

      <div className="activity-frame">
        <div className="activity-rail" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>

        <section className="data-section latest-reports">
          <div className="section-heading">
            <div>
              <h2>Laporan terbaru</h2>
              <p>Aktivitas harian yang baru dikirim oleh pegawai.</p>
            </div>
            <Link className="text-link" to="/admin/laporan">
              Lihat semua <Icon name="chevronRight" size={17} />
            </Link>
          </div>
          <div className="table-wrap">
            <table>
              <caption className="sr-only">Laporan terbaru</caption>
              <thead>
                <tr>
                  <th>Pekerjaan</th>
                  <th>Lokasi</th>
                  <th>PIC</th>
                  <th>Keterangan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(data?.terbaru || []).slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td>{item.pekerjaan?.namaPekerjaan || '-'}</td>
                    <td>
                      {item.cluster?.desa?.namaDesa || '-'} ·{' '}
                      {item.cluster?.clusterName || '-'}
                    </td>
                    <td>
                      <strong>{item.user?.nama || '-'}</strong>
                    </td>
                    <td className="description-cell">
                      {item.keterangan || '-'}
                    </td>
                    <td>
                      <Link
                        className="table-link"
                        to={`/admin/laporan/${item.id}`}
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
                {!data?.terbaru?.length && (
                  <tr>
                    <td className="empty-cell" colSpan="5">
                      Belum ada laporan terbaru.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="metric-band" aria-label="Ringkasan pegawai lapor">
          <article>
            <span>Pegawai wajib lapor</span>
            <strong>{data?.wajibLapor ?? 0}</strong>
            <small>pegawai aktif</small>
          </article>
          <article>
            <span>Sudah melapor</span>
            <strong className="success-value">{data?.sudahMelapor ?? 0}</strong>
            <small>tanggal {labelDate}</small>
          </article>
          <article>
            <span>Belum melapor</span>
            <strong className="signal-value">{data?.belumMelapor ?? 0}</strong>
            <small>tanggal {labelDate}</small>
          </article>
        </section>

        <div className="dashboard-grid">
          <article className="data-section">
            <div className="section-heading">
              <div>
                <h2>Progres per Cluster / Desa</h2>
                <p>Ringkasan akumulasi laporan harian per wilayah.</p>
              </div>
            </div>
            <ul className="distribution-list">
              {(data?.distribusiDesa || []).map((item) => (
                <li key={item.namaDesa}>
                  <div>
                    <span>{item.namaDesa}</span>
                    <span className="distribution-track">
                      <i
                        style={{
                          width: `${Math.max(item.jumlah > 0 ? 8 : 0, (item.jumlah / highestVillage) * 100)}%`,
                        }}
                      />
                    </span>
                  </div>
                  <strong>{item.jumlah}</strong>
                </li>
              ))}
              {!data?.distribusiDesa?.length && (
                <li className="empty-state">
                  Belum ada data progres wilayah.
                </li>
              )}
            </ul>
          </article>

          <article className="data-section">
            <div className="section-heading">
              <div>
                <h2>Progres per Pekerjaan</h2>
                <p>Aktivitas pengerjaan berdasarkan jenis pekerjaan proyek.</p>
              </div>
            </div>
            <ul className="distribution-list">
              {(data?.distribusiPekerjaan || []).map((item) => (
                <li key={item.namaPekerjaan}>
                  <div>
                    <span>{item.namaPekerjaan}</span>
                    <span className="distribution-track">
                      <i
                        style={{
                          width: `${Math.max(item.jumlah > 0 ? 8 : 0, (item.jumlah / highestJob) * 100)}%`,
                        }}
                      />
                    </span>
                  </div>
                  <strong>{item.jumlah}</strong>
                </li>
              ))}
              {!data?.distribusiPekerjaan?.length && (
                <li className="empty-state">
                  Belum ada data pekerjaan pengerjaan.
                </li>
              )}
            </ul>
          </article>
        </div>
      </div>
    </section>
  )
}
