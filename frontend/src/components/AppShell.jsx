import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider.jsx'
import Icon from './Icon.jsx'

export default function AppShell({
  roleLabel,
  navItems,
  navSections,
  mobileFirst = false,
  brandMark = 'SP',
  brandTitle = 'Sistem Pelaporan',
  brandSub = 'Kegiatan Pegawai',
  theme = 'default',
}) {
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
    <div className={`app-shell ${mobileFirst ? 'employee-shell' : ''} theme-${theme}`.trim()}>
      <aside className="app-sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">{brandMark}</span>
          <div>
            <strong>{brandTitle}</strong>
            {brandSub && <small>{brandSub}</small>}
          </div>
        </div>
        <nav aria-label={`Navigasi ${roleLabel}`}>
          {navSections ? (
            navSections.map((sec, idx) => (
              sec.items ? (
                <div key={idx} className="sidebar-nav-group">
                  <div className="sidebar-group-title">
                    {sec.icon && <Icon name={sec.icon} size={18} />}
                    <span>{sec.title}</span>
                  </div>
                  <div className="sidebar-sub-items">
                    {sec.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => (isActive || item.isActive?.(location.pathname) ? 'active' : undefined)}
                      >
                        <Icon name={item.icon} size={16} />
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              ) : (
                <NavLink
                  key={sec.to}
                  to={sec.to}
                  className={({ isActive }) => (isActive || sec.isActive?.(location.pathname) ? 'active' : undefined)}
                >
                  <Icon name={sec.icon} />
                  <span>{sec.label}</span>
                </NavLink>
              )
            ))
          ) : (
            navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive || item.isActive?.(location.pathname) ? 'active' : undefined)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))
          )}
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
        <button className="logout-button" type="button" aria-label="Keluar" onClick={handleLogout}><Icon name="logout" /><span>Keluar</span></button>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-search-wrap">
            <Icon name="search" size={16} className="topbar-search-icon" />
            <input
              type="search"
              aria-label="Cari halaman"
              placeholder="Search pages..."
              className="topbar-search-input"
            />
          </div>
          <div className="topbar-actions">
            <button type="button" className="icon-button topbar-notif-btn" aria-label="Notifikasi">
              <Icon name="bell" size={18} />
            </button>
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
              <span className="topbar-user-name">{user?.nama} ({roleLabel})</span>
            </div>
          </div>
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
