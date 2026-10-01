import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AppShell from './AppShell.jsx'

vi.mock('../features/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({
    user: { nama: 'Ayu Pegawai' },
    logout: vi.fn(),
  }),
}))

describe('AppShell', () => {
  afterEach(cleanup)
  it('provides a dedicated bottom navigation for the mobile employee shell', () => {
    render(
      <MemoryRouter initialEntries={['/pegawai/laporan/new']}>
        <AppShell
          roleLabel="Pegawai"
          mobileFirst
          navItems={[
            { to: '/pegawai/laporan/new', label: 'Buat laporan', icon: 'report' },
            { to: '/pegawai/histori', label: 'Histori', icon: 'history' },
          ]}
        />
      </MemoryRouter>,
    )

    const mobileNavigation = screen.getByRole('navigation', { name: /navigasi bawah pegawai/i })
    expect(mobileNavigation).toBeInTheDocument()
    expect(mobileNavigation.querySelectorAll('a')).toHaveLength(2)
  })

  it('opens all employee sections in a menu and closes after navigation', () => {
    render(<MemoryRouter initialEntries={['/pegawai/dashboard']}><AppShell roleLabel="Pegawai" mobileFirst
      navItems={[{ to: '/pegawai/projects', label: 'Project', icon: 'folder' }]}
      navSections={[{ title: 'Management Project', items: [
        { to: '/pegawai/clusters', label: 'Clusters', icon: 'database' },
        { to: '/pegawai/homepass', label: 'Homepass', icon: 'home' },
      ] }]} /></MemoryRouter>)
    const trigger = screen.getByRole('button', { name: 'Buka menu navigasi' })
    fireEvent.click(trigger)
    const menu = screen.getByRole('dialog', { name: 'Menu pegawai' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(within(menu).getByText('Ayu Pegawai')).toBeInTheDocument()
    expect(within(menu).getByRole('link', { name: 'Homepass' })).toBeInTheDocument()
    fireEvent.click(within(menu).getByRole('link', { name: 'Clusters' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('marks the project section active on cluster routes', () => {
    render(<MemoryRouter initialEntries={['/pegawai/clusters/c1']}><AppShell roleLabel="Pegawai" mobileFirst
      navItems={[{ to: '/pegawai/projects', label: 'Project', icon: 'folder', isActive: path => path.startsWith('/pegawai/clusters') }]} /></MemoryRouter>)
    const nav = screen.getByRole('navigation', { name: 'Navigasi bawah Pegawai' })
    expect(within(nav).getByRole('link', { name: 'Project' })).toHaveAttribute('aria-current', 'page')
  })
})
