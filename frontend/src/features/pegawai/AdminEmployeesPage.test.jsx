import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AdminEmployeesPage from './AdminEmployeesPage.jsx'

describe('AdminEmployeesPage', () => {
  afterEach(() => cleanup())
  it('renders employee status from the admin API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ id: 'u1', nama: 'Ayu', username: 'ayu', isActive: true }] }) }))
    render(<AdminEmployeesPage />)
    await waitFor(() => expect(screen.getByText('Ayu')).toBeInTheDocument())
    expect(screen.getByText('Aktif')).toBeInTheDocument()
  })

  it('creates an employee and exposes the wajib lapor setting', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'u1', nama: 'Ayu', username: 'ayu', wajibLapor: true, isActive: true } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'u1', nama: 'Ayu', username: 'ayu', wajibLapor: true, isActive: true }] }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminEmployeesPage />)

    await waitFor(() => expect(screen.getByRole('button', { name: /tambah pegawai/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /tambah pegawai/i }))
    fireEvent.change(screen.getByLabelText(/nama pegawai/i), { target: { value: 'Ayu' } })
    fireEvent.change(screen.getByLabelText(/^username/i), { target: { value: 'ayu' } })
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password-ku' } })
    fireEvent.click(screen.getByLabelText(/wajib membuat laporan/i))
    fireEvent.click(screen.getByRole('button', { name: /simpan pegawai/i }))

    await waitFor(() => expect(fetchMock.mock.calls.some(([url, options]) => String(url).endsWith('/api/admin/pegawai') && options?.method === 'POST' && String(options.body).includes('"wajibLapor":true'))).toBe(true))
  })
})
