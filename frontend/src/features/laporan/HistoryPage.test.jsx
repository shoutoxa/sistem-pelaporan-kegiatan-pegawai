import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import HistoryPage from './HistoryPage.jsx'

describe('HistoryPage', () => {
  it('renders reports returned by the employee history endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { items: [{ id: 'r1', tanggalKegiatan: '2026-08-22', keterangan: 'Kegiatan selesai', rw: { nomorRw: 'RW 01', desa: { namaDesa: 'Dewasari' } }, tahapan: { namaTahapan: 'ODN' } }], total: 1 } }) }))
    render(<MemoryRouter><HistoryPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Kegiatan selesai')).toBeInTheDocument())
    expect(screen.getByText(/Dewasari/)).toBeInTheDocument()
  })
})
