import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider.jsx'
import Icon from './Icon.jsx'

export default function AppShell({ roleLabel, navItems }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const initials = (user?.nama || roleLabel).split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">SP</span>
          <div><strong>Sistem Pelaporan</strong><small>Kegiatan Pegawai</small></div>
        </div>
        <nav aria-label={`Navigasi ${roleLabel}`}>
          {navItems.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'active' : undefined}><Icon name={item.icon} /><span>{item.label}</span></NavLink>)}
        </nav>
        <div className="sidebar-account">
          <div className="avatar" aria-hidden="true">{initials}</div>
          <div className="account-copy"><strong>{user?.nama}</strong><small>{roleLabel}</small></div>
        </div>
        <button className="logout-button" type="button" onClick={handleLogout}><Icon name="logout" /><span>Keluar</span></button>
      </aside>
      <div className="app-main">
        <header className="app-topbar"><span>Operasional harian</span><time dateTime={new Date().toISOString()}>{new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date())}</time></header>
        <Outlet />
      </div>
    </div>
  )
}
