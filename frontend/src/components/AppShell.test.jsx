import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AppShell from './AppShell.jsx'

vi.mock('../features/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({
    user: { nama: 'Ayu Pegawai' },
    logout: vi.fn(),
  }),
}))

describe('AppShell', () => {
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
})
