import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider.jsx'
import Icon from './Icon.jsx'

export default function AppShell({ roleLabel, navItems, mobileFirst = false }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const initials = (user?.nama || roleLabel).split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
  const userAvatar = user?.fotoProfilUrl || user?.fotoProfil

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className={`app-shell ${mobileFirst ? 'employee-shell' : ''}`.trim()}>
      <aside className="app-sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">SP</span>
          <div><strong>Sistem Pelaporan</strong><small>Kegiatan Pegawai</small></div>
        </div>
        <nav aria-label={`Navigasi ${roleLabel}`}>
          {navItems.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive || item.isActive?.(location.pathname) ? 'active' : undefined}><Icon name={item.icon} /><span>{item.label}</span></NavLink>)}
        </nav>
        <div className="sidebar-account">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={`Foto ${user?.nama}`}
              className="avatar avatar-img"
            />
          ) : (
            <div className="avatar" aria-hidden="true">{initials}</div>
          )}
          <div className="account-copy"><strong>{user?.nama}</strong><small>{roleLabel}</small></div>
        </div>
        <button className="logout-button" type="button" onClick={handleLogout}><Icon name="logout" /><span>Keluar</span></button>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-user">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={`Foto ${user?.nama}`}
                className="avatar avatar-img mobile-avatar"
              />
            ) : (
              <div className="avatar mobile-avatar" aria-hidden="true">{initials}</div>
            )}
            <span>{user?.nama} ({roleLabel})</span>
          </div>
          <time dateTime={new Date().toISOString()}>{new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date())}</time>
        </header>
        <Outlet />
        {mobileFirst && (
          <nav className="employee-bottom-nav" aria-label={`Navigasi bawah ${roleLabel}`}>
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive || item.isActive?.(location.pathname) ? 'active' : undefined}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}
