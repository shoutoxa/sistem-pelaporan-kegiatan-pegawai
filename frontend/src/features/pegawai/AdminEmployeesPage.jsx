import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function AdminEmployeesPage() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const load = () => fetch(`${API_URL}/api/admin/pegawai`, { credentials: 'include' }).then((response) => response.json()).then((body) => setRows(body.data || [])).catch(() => setError('Data Pegawai tidak dapat dimuat.'))
  useEffect(() => { load() }, [])
  async function toggle(row) { await fetch(`${API_URL}/api/admin/pegawai/${row.id}/status`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !row.isActive }) }); load() }
  return <section className="page"><h1>Data Pegawai</h1>{error && <p role="alert">{error}</p>}<table><thead><tr><th>Nama</th><th>Username</th><th>Status</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.nama}</td><td>{row.username}</td><td>{row.isActive ? 'Aktif' : 'Nonaktif'}</td><td><button onClick={() => toggle(row)}>{row.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button></td></tr>)}</tbody></table></section>
}
