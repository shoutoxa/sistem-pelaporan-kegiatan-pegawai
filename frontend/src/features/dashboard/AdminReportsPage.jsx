import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../../api/dashboard.js'
import { exportReports } from '../../api/export.js'

export default function AdminReportsPage() {
  const [filters, setFilters] = useState({ from: '', to: '' })
  const [result, setResult] = useState({ items: [], total: 0 })
  useEffect(() => { dashboardApi.listReports(filters).then((response) => setResult(response.data)).catch(() => setResult({ items: [], total: 0 })) }, [filters])
  const [error, setError] = useState('')
  async function download() { setError(''); try { const blob = await exportReports(filters); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'laporan.xlsx'; anchor.click(); URL.revokeObjectURL(url) } catch (requestError) { setError(requestError.message || 'Ekspor gagal.') } }
  return <section className="page"><div className="page-heading"><div><p className="eyebrow">Monitoring kegiatan</p><h1>Semua Laporan</h1><p>Tinjau laporan lapangan dan unduh rekap sesuai periode.</p></div><button className="primary-button" onClick={download}>Ekspor Excel</button></div>{error && <p className="notice error" role="alert">{error}</p>}<div className="panel filter-panel"><div className="field-grid"><label>Dari tanggal<input aria-label="Dari tanggal" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label><label>Sampai tanggal<input aria-label="Sampai tanggal" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label></div></div><div className="panel table-panel"><div className="table-heading"><h2>Daftar laporan</h2><span className="count-badge">{result.total} laporan</span></div><div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Pegawai</th><th>Lokasi</th><th>Tahapan</th><th>Keterangan</th><th>Aksi</th></tr></thead><tbody>{result.items.map((item) => <tr key={item.id}><td>{String(item.tanggalKegiatan).slice(0, 10)}</td><td>{item.user?.nama || '-'}</td><td>{item.rw?.desa?.namaDesa || '-'} · {item.rw?.nomorRw || '-'}</td><td>{item.tahapan?.namaTahapan || '-'}</td><td className="description-cell">{item.keterangan}</td><td><Link className="table-link" to={`/admin/laporan/${item.id}`}>Detail</Link></td></tr>)}{result.items.length === 0 && <tr><td className="empty-cell" colSpan="6">Belum ada laporan pada periode ini.</td></tr>}</tbody></table></div></div></section>
}
