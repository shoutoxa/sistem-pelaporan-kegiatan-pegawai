import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../features/auth/AuthProvider.jsx'
import Icon from './Icon.jsx'
import FtthDialog from '../features/integration/FtthDialog.jsx'

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
  const [menuOpen, setMenuOpen] = useState(false)
  const initials = (user?.nama || roleLabel).split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
  const userAvatar = user?.fotoProfilUrl || user?.fotoProfil
  const pageTitle = `${(navSections ? navSections.flatMap((section) => section.items || [section]) : navItems)
    .find((item) => location.pathname === item.to)?.label || roleLabel} — ${brandTitle}`
  useEffect(() => { document.title = pageTitle }, [pageTitle])

  async function handleLogout() {
    await logout()
    setMenuOpen(false)
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
        {mobileFirst && <button type="button" className="employee-menu-trigger" aria-label="Buka menu navigasi"
          aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Icon name="menu" /></button>}
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
            <select aria-label="Pindah halaman" className="topbar-search-input" value=""
              onChange={(event) => { if (event.target.value) navigate(event.target.value) }}>
              <option value="">Pindah halaman…</option>
              {(navSections ? navSections.flatMap((section) => section.items || [section]) : navItems).map((item) =>
                <option key={item.to} value={item.to}>{item.label}</option>)}
            </select>
          </div>
          <div className="topbar-actions">
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
            {navItems.map((item) => {
              const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`) || item.isActive?.(location.pathname)
              return <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} className={active ? 'active' : undefined}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            })}
          </nav>
        )}
      </div>
      {mobileFirst && menuOpen && <FtthDialog title="Menu pegawai" responsive onClose={() => setMenuOpen(false)}>
        <div className="employee-menu-account"><div className="avatar" aria-hidden="true">{initials}</div>
          <div><strong>{user?.nama}</strong><small>{roleLabel}</small></div></div>
        <nav className="employee-menu-links" aria-label="Semua halaman pegawai">
          {(navSections || navItems).map((section) => <div key={section.title || section.to}>
            {section.items && <h3>{section.title}</h3>}
            {(section.items || [section]).map((item) => <NavLink key={item.to} to={item.to}
              className={({ isActive }) => isActive || item.isActive?.(location.pathname) ? 'active' : undefined}
              onClick={() => setMenuOpen(false)}><Icon name={item.icon} /><span>{item.label}</span><Icon name="chevronRight" size={16} /></NavLink>)}
          </div>)}
        </nav>
        <button className="secondary-button employee-menu-logout" type="button" onClick={handleLogout}><Icon name="logout" />Keluar</button>
      </FtthDialog>}
    </div>
  )
}
