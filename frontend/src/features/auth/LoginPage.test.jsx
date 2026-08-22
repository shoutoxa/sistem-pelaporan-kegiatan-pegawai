import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './AuthProvider.jsx'
import LoginPage from './LoginPage.jsx'

function renderLogin(fetchMock) {
  vi.stubGlobal('fetch', fetchMock)
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pegawai/laporan/new" element={<p>pegawai-report-form</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('redirects a successful Pegawai login to the employee area', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'Sesi tidak valid' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ user: { id: 'u1', role: 'PEGAWAI', nama: 'Ayu' } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ user: { id: 'u1', role: 'PEGAWAI', nama: 'Ayu' } }) })
    renderLogin(fetchMock)

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'ayu' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /masuk/i }))

    await waitFor(() => expect(screen.getByText('pegawai-report-form')).toBeInTheDocument())
  })

  it('shows the public invalid credential message', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'Sesi tidak valid' }) })
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'Username atau password tidak valid.' }) })
    renderLogin(fetchMock)

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'ayu' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'bad' } })
    fireEvent.click(screen.getByRole('button', { name: /masuk/i }))

    await waitFor(() => expect(screen.getByText('Username atau password tidak valid.')).toBeInTheDocument())
  })
})
