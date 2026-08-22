import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AdminReportsPage from './AdminReportsPage.jsx'

describe('AdminReportsPage', () => {
  it('serializes the date filter into the admin request query', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { items: [], total: 0 } }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminReportsPage />)
    fireEvent.change(screen.getByLabelText(/dari tanggal/i), { target: { value: '2026-08-22' } })
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('from=2026-08-22'))).toBe(true))
    expect(screen.getByLabelText(/pegawai/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tahapan/i)).toBeInTheDocument()
  })
})
