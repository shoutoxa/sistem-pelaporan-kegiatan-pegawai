import { useEffect, useState } from 'react'
import { dashboardApi } from '../../api/dashboard.js'
import { exportReports } from '../../api/export.js'

export default function AdminReportsPage() {
  const [filters, setFilters] = useState({ from: '', to: '' })
  const [result, setResult] = useState({ items: [], total: 0 })
  useEffect(() => { dashboardApi.listReports(filters).then((response) => setResult(response.data)).catch(() => setResult({ items: [], total: 0 })) }, [filters])
  async function download() { const blob = await exportReports(filters); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'laporan.xlsx'; anchor.click(); URL.revokeObjectURL(url) }
  return <section className="page"><div className="table-heading"><h1>Semua Laporan</h1><button onClick={download}>Ekspor Excel</button></div><div className="field-grid"><label>Dari tanggal<input aria-label="Dari tanggal" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label><label>Sampai tanggal<input aria-label="Sampai tanggal" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label></div><p>{result.total} laporan</p><table><thead><tr><th>Tanggal</th><th>Keterangan</th></tr></thead><tbody>{result.items.map((item) => <tr key={item.id}><td>{item.tanggalKegiatan}</td><td>{item.keterangan}</td></tr>)}</tbody></table></section>
}
