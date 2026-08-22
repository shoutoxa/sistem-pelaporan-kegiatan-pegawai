import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function AdminEmployeesPage() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const load = () => fetch(`${API_URL}/api/admin/pegawai`, { credentials: 'include' }).then((response) => { if (!response.ok) throw new Error('Data Pegawai tidak dapat dimuat.'); return response.json() }).then((body) => setRows(body.data || [])).catch((requestError) => setError(requestError.message))
  useEffect(() => { load() }, [])
  async function toggle(row) { setError(''); setMessage(''); try { const response = await fetch(`${API_URL}/api/admin/pegawai/${row.id}/status`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !row.isActive }) }); if (!response.ok) throw new Error('Status Pegawai gagal diperbarui.'); setMessage(`${row.nama} berhasil ${row.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`); load() } catch (requestError) { setError(requestError.message) } }
  return <section className="page"><div className="page-heading"><div><p className="eyebrow">Akses pengguna</p><h1>Data Pegawai</h1><p>Kelola status akun Pegawai yang menggunakan sistem pelaporan.</p></div></div>{message && <p className="notice success" role="status">{message}</p>}{error && <p className="notice error" role="alert">{error}</p>}<div className="panel table-panel"><div className="table-heading"><h2>Daftar Pegawai</h2><span className="count-badge">{rows.length} akun</span></div><div className="table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th>Wajib Lapor</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.nama}</td><td>{row.username}</td><td>{row.wajibLapor ? 'Ya' : 'Tidak'}</td><td><span className={`status-badge ${row.isActive ? 'active' : 'inactive'}`}>{row.isActive ? 'Aktif' : 'Nonaktif'}</span></td><td><button className="text-button" onClick={() => toggle(row)}>{row.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button></td></tr>)}</tbody></table></div></div></section>
}
