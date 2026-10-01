import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../../api/dashboard.js'
import PageHeader from '../../components/PageHeader.jsx'
import PageState from '../../components/PageState.jsx'
import Icon from '../../components/Icon.jsx'
import FtthReportPanel from '../integration/FtthReportPanel.jsx'

const POLL_MS = 30_000

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)
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
        description="Pantau pelaporan hari ini dan aktivitas seluruh project."
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

      {data?.complianceAvailable === false && <p role="status">Data wajib lapor dari perusahaan belum lengkap. Angka kepatuhan belum dapat dihitung.</p>}
      {data?.kepatuhanCluster && <div className="dashboard-daily-note"><strong>{data.kepatuhanCluster.sudah} / {data.kepatuhanCluster.total} cluster sudah dilaporkan hari ini</strong><span>Pegawai dihitung sudah melapor jika seluruh cluster tugasnya terpenuhi.{data.kepatuhanCluster.tanpaPenugasan > 0 && ` ${data.kepatuhanCluster.tanpaPenugasan} pegawai wajib lapor belum memiliki penugasan.`}</span></div>}
      {state === 'error' && data && <p role="alert">Pembaruan gagal. Data di bawah adalah hasil terakhir yang berhasil dimuat.</p>}
      {selected && <FtthReportPanel key={selected} id={selected} onClose={() => setSelected(null)} onChanged={refresh} />}

      <div className="dashboard-content">
        <section className="metric-band" aria-label="Ringkasan pegawai lapor">
          <article>
            <span>Pegawai wajib lapor</span>
            <strong>{data?.wajibLapor ?? '—'}</strong>
            <small>pegawai aktif</small>
          </article>
          <article>
            <span>Sudah melapor</span>
            <strong className="success-value">{data?.sudahMelapor ?? '—'}</strong>
            <small>tanggal {labelDate}</small>
          </article>
          <article>
            <span>Belum melapor</span>
            <strong className="signal-value">{data?.belumMelapor ?? '—'}</strong>
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
            <table className="responsive-records">
              <caption className="sr-only">Laporan terbaru</caption>
              <thead>
                <tr>
                  <th>Pegawai</th>
                  <th>Pekerjaan</th>
                  <th>Lokasi</th>
                  <th>Keterangan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(data?.terbaru || []).slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td data-label="Pegawai">{item.user?.nama || '-'}</td>
                    <td data-label="Pekerjaan">{item.pekerjaan?.namaPekerjaan || '-'}</td>
                    <td className="location-cell" data-label="Lokasi">
                      <span>{item.cluster?.desa?.namaDesa || '-'}</span>
                      <small className="table-subline">{item.cluster?.clusterName || '-'}</small>
                    </td>
                    <td className="description-cell" data-label="Keterangan">
                      {item.keterangan || '-'}
                    </td>
                    <td className="record-actions">
                      {data?.source === 'ftth' ? <button className="secondary-button" onClick={() => setSelected(item.id)}>Detail</button> : <Link
                        className="table-link"
                        to={`/admin/laporan/${item.id}`}
                      >
                        Detail
                      </Link>}
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
                <h2>{data?.source === 'ftth' ? 'Data berdasarkan Project' : 'Progres per Cluster / Desa'}</h2>
                <p>Ringkasan akumulasi laporan harian per wilayah.</p>
              </div>
            </div>
            <ul className="distribution-list">
              {(data?.distribusiDesa || []).map((item) => (
                <li key={item.id || item.namaDesa}>
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
                <h2>Laporan per Pekerjaan</h2>
                <p>Akumulasi seluruh tanggal, bukan persentase penyelesaian.</p>
              </div>
            </div>
            <ul className="distribution-list jobs-distribution" tabIndex={0} aria-label="Distribusi seluruh pekerjaan">
              {(data?.distribusiPekerjaan || []).map((item) => (
                <li key={item.id || item.namaPekerjaan}>
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
