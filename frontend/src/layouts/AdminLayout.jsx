import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider.jsx'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navClass = ({ isActive }) => isActive ? 'active' : undefined
  return <div className="app-shell"><header><div className="brand"><span className="brand-mark">SP</span><div><strong>Sistem Pelaporan</strong><small>Superadmin</small></div></div><nav aria-label="Navigasi Superadmin"><NavLink className={navClass} to="/admin/dashboard">Dashboard</NavLink><NavLink className={navClass} to="/admin/laporan">Laporan</NavLink><NavLink className={navClass} to="/admin/pegawai">Pegawai</NavLink><NavLink className={navClass} to="/admin/master">Master Data</NavLink></nav><div className="user-menu"><span><strong>{user?.nama}</strong><small>Superadmin</small></span><button className="secondary-button" onClick={async () => { await logout(); navigate('/login') }}>Keluar</button></div></header><Outlet /></div>
}
