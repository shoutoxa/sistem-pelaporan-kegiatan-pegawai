import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider.jsx'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return <div className="app-shell"><header><strong>Superadmin</strong><Link to="/admin/dashboard">Dashboard</Link><Link to="/admin/laporan">Laporan</Link><Link to="/admin/pegawai">Pegawai</Link><span>{user?.nama} ({user?.role})</span><button onClick={async () => { await logout(); navigate('/login') }}>Keluar</button></header><Outlet /></div>
}
