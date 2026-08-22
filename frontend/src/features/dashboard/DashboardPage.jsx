import { useCallback, useEffect, useState } from 'react'
import { dashboardApi } from '../../api/dashboard.js'

const POLL_MS = 30_000

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const refresh = useCallback(() => { setState('loading'); return dashboardApi.get().then((response) => { setData(response.data); setState('ready') }).catch(() => setState('error')) }, [])
  useEffect(() => { refresh(); const timer = setInterval(refresh, POLL_MS); return () => clearInterval(timer) }, [refresh])
  if (state === 'loading' && !data) return <section className="page"><p role="status">Memuat dashboard...</p></section>
  if (state === 'error' && !data) return <section className="page"><p role="alert">Dashboard tidak dapat dimuat.</p></section>
  return <section className="page"><div className="page-heading"><div><p className="eyebrow">Ringkasan hari ini</p><h1>Dashboard Superadmin</h1><p>Pantau kepatuhan pelaporan dan persebaran kegiatan lapangan.</p></div><button className="secondary-button" onClick={refresh}>Muat ulang</button></div><div className="metric-grid"><article><span>Wajib lapor</span><strong>{data?.wajibLapor ?? 0}</strong><small>Pegawai aktif</small></article><article><span>Sudah melapor</span><strong>{data?.sudahMelapor ?? 0}</strong><small>Pegawai hari ini</small></article><article><span>Belum melapor</span><strong>{data?.belumMelapor ?? 0}</strong><small>Perlu ditindaklanjuti</small></article><article><span>Jumlah laporan</span><strong>{data?.jumlahLaporan ?? 0}</strong><small>Baris laporan hari ini</small></article></div><div className="dashboard-grid"><article className="panel"><div className="table-heading"><h2>Distribusi Desa</h2><span className="count-badge">Hari ini</span></div><ul className="distribution-list">{(data?.distribusiDesa || []).map((item) => <li key={item.namaDesa}><span>{item.namaDesa}</span><strong>{item.jumlah}</strong></li>)}{!data?.distribusiDesa?.length && <li className="empty-state">Belum ada laporan hari ini.</li>}</ul></article><article className="panel"><div className="table-heading"><h2>Distribusi Tahapan</h2><span className="count-badge">Hari ini</span></div><ul className="distribution-list">{(data?.distribusiTahapan || []).map((item) => <li key={item.namaTahapan}><span>{item.namaTahapan}</span><strong>{item.jumlah}</strong></li>)}{!data?.distribusiTahapan?.length && <li className="empty-state">Belum ada tahapan yang dilaporkan.</li>}</ul></article></div></section>
}
