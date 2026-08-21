import { useEffect, useState } from 'react'
import { dashboardApi } from '../../api/dashboard.js'

export default function AdminReportsPage() {
  const [filters, setFilters] = useState({ from: '', to: '' })
  const [result, setResult] = useState({ items: [], total: 0 })
  useEffect(() => { dashboardApi.listReports(filters).then((response) => setResult(response.data)).catch(() => setResult({ items: [], total: 0 })) }, [filters])
  return <section className="page"><h1>Semua Laporan</h1><div className="field-grid"><label>Dari tanggal<input aria-label="Dari tanggal" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label><label>Sampai tanggal<input aria-label="Sampai tanggal" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label></div><p>{result.total} laporan</p><table><thead><tr><th>Tanggal</th><th>Keterangan</th></tr></thead><tbody>{result.items.map((item) => <tr key={item.id}><td>{item.tanggalKegiatan}</td><td>{item.keterangan}</td></tr>)}</tbody></table></section>
}
