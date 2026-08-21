import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider.jsx'

export default function EmployeeLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return <div className="app-shell"><header><strong>Pegawai</strong><Link to="/pegawai/laporan/new">Buat laporan</Link><span>{user?.nama} ({user?.role})</span><button onClick={async () => { await logout(); navigate('/login') }}>Keluar</button></header><Outlet /></div>
}
