import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { historyApi } from '../../api/history.js'

export default function HistoryPage() {
  const [result, setResult] = useState({ items: [], total: 0 })
  const [state, setState] = useState('loading')
  useEffect(() => { historyApi.listMine().then((response) => { setResult(response.data); setState('ready') }).catch(() => setState('error')) }, [])
  if (state === 'loading') return <section className="page"><p role="status">Memuat histori...</p></section>
  if (state === 'error') return <section className="page"><p role="alert">Histori tidak dapat dimuat.</p></section>
  return <section className="page"><div className="page-heading"><div><p className="eyebrow">Aktivitas saya</p><h1>Histori Laporan</h1><p>Semua laporan kegiatan yang pernah Anda kirim.</p></div><Link className="primary-button" to="/pegawai/laporan/new">Buat laporan</Link></div><div className="panel table-panel"><div className="table-heading"><h2>Daftar laporan</h2><span className="count-badge">{result.total} laporan</span></div><div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Lokasi</th><th>Tahapan</th><th>Keterangan</th><th>Aksi</th></tr></thead><tbody>{result.items.map((item) => <tr key={item.id}><td>{String(item.tanggalKegiatan).slice(0, 10)}</td><td>{item.rw?.desa?.namaDesa} · {item.rw?.nomorRw}</td><td>{item.tahapan?.namaTahapan}</td><td className="description-cell">{item.keterangan}</td><td><Link className="table-link" to={`/pegawai/laporan/${item.id}`}>Detail</Link></td></tr>)}{!result.items?.length && <tr><td className="empty-cell" colSpan="5">Belum ada laporan. Mulai dengan membuat laporan kegiatan pertama.</td></tr>}</tbody></table></div></div></section>
}
