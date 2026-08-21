import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { historyApi } from '../../api/history.js'

export default function HistoryPage() {
  const [result, setResult] = useState({ items: [], total: 0 })
  const [state, setState] = useState('loading')
  useEffect(() => { historyApi.listMine().then((response) => { setResult(response.data); setState('ready') }).catch(() => setState('error')) }, [])
  if (state === 'loading') return <section className="page"><p role="status">Memuat histori...</p></section>
  if (state === 'error') return <section className="page"><p role="alert">Histori tidak dapat dimuat.</p></section>
  return <section className="page"><h1>Histori Laporan</h1>{!result.items?.length ? <p>Belum ada laporan.</p> : <table><thead><tr><th>Tanggal</th><th>Lokasi</th><th>Tahapan</th><th>Keterangan</th><th /></tr></thead><tbody>{result.items.map((item) => <tr key={item.id}><td>{item.tanggalKegiatan}</td><td>{item.rw?.desa?.namaDesa} {item.rw?.nomorRw}</td><td>{item.tahapan?.namaTahapan}</td><td>{item.keterangan}</td><td><Link to={`/pegawai/laporan/${item.id}`}>Detail</Link></td></tr>)}</tbody></table>}</section>
}
