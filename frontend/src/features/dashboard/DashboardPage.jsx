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
  return <section className="page"><div className="table-heading"><h1>Dashboard Superadmin</h1><button onClick={refresh}>Muat ulang</button></div><div className="metric-grid"><article><strong>{data?.wajibLapor ?? 0}</strong><span>Wajib lapor</span></article><article><strong>{data?.sudahMelapor ?? 0}</strong><span>Sudah melapor</span></article><article><strong>{data?.belumMelapor ?? 0}</strong><span>Belum melapor</span></article><article><strong>{data?.jumlahLaporan ?? 0}</strong><span>Jumlah laporan</span></article></div><h2>Distribusi Desa</h2><ul>{(data?.distribusiDesa || []).map((item) => <li key={item.namaDesa}>{item.namaDesa}: {item.jumlah}</li>)}</ul></section>
}
