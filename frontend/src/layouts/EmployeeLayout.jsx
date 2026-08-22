import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider.jsx'

export default function EmployeeLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navClass = ({ isActive }) => isActive ? 'active' : undefined
  return <div className="app-shell"><header><div className="brand"><span className="brand-mark">SP</span><div><strong>Sistem Pelaporan</strong><small>Pegawai</small></div></div><nav aria-label="Navigasi Pegawai"><NavLink className={navClass} to="/pegawai/laporan/new">Buat laporan</NavLink><NavLink className={navClass} to="/pegawai/histori">Histori</NavLink></nav><div className="user-menu"><span><strong>{user?.nama}</strong><small>Pegawai</small></span><button className="secondary-button" onClick={async () => { await logout(); navigate('/login') }}>Keluar</button></div></header><Outlet /></div>
}
