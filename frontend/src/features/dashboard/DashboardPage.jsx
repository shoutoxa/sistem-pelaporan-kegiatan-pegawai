import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../../api/dashboard.js'
import PageHeader from '../../components/PageHeader.jsx'
import PageState from '../../components/PageState.jsx'
import Icon from '../../components/Icon.jsx'

const POLL_MS = 30_000

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const refresh = useCallback(() => {
    setState((current) => (current === 'ready' ? 'refreshing' : 'loading'))
    return dashboardApi
      .get()
      .then((response) => {
        setData(response.data)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_MS)
    return () => clearInterval(timer)
  }, [refresh])

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

  const highestProject = Math.max(
    1,
    ...(data?.distribusiProject || []).map((item) => item.jumlah),
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

      <div className="dashboard-content">
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
                  <th>Pegawai</th>
                  <th>Pekerjaan</th>
                  <th>Project / Cluster</th>
                  <th>Keterangan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(data?.terbaru || []).slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td>{item.user?.nama || item.user?.name || '-'}</td>
                    <td>{item.process?.name || item.master_process?.name || '-'}</td>
                    <td>
                      {item.project?.name || item.project_name || '-'} ·{' '}
                      {item.cluster?.name || item.cluster_name || '-'}
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

        <div className="dashboard-grid">
          <article className="data-section">
            <div className="section-heading">
              <div>
                <h2>Progres per Project</h2>
                <p>Ringkasan akumulasi laporan harian per project.</p>
              </div>
            </div>
            <ul className="distribution-list">
              {(data?.distribusiProject || []).map((item, index) => (
                <li key={item.name || `project-${index}`}>
                  <div>
                    <span>{item.name}</span>
                    <span className="distribution-track">
                      <i
                        style={{
                          width: `${Math.max(item.jumlah > 0 ? 8 : 0, (item.jumlah / highestProject) * 100)}%`,
                        }}
                      />
                    </span>
                  </div>
                  <strong>{item.jumlah}</strong>
                </li>
              ))}
              {!data?.distribusiProject?.length && (
                <li key="empty-project" className="empty-state">
                  Belum ada data progres project.
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
              {(data?.distribusiPekerjaan || []).map((item, index) => (
                <li key={item.name || `job-${index}`}>
                  <div>
                    <span>{item.name}</span>
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
                <li key="empty-job" className="empty-state">
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