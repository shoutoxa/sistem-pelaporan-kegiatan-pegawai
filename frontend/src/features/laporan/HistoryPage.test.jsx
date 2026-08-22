import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import HistoryPage from './HistoryPage.jsx'

describe('HistoryPage', () => {
  it('renders reports returned by the employee history endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { items: [{ id: 'r1', tanggalKegiatan: '2026-08-22', createdAt: '2026-08-22T03:15:00Z', keterangan: 'Kegiatan selesai', nomorPerangkat: 'ODP-01', canEdit: true, dokumentasi: [{ id: 'f1' }], rw: { nomorRw: 'RW 01', desa: { namaDesa: 'Dewasari' } }, tahapan: { id: 't1', namaTahapan: 'ODN' } }], total: 1, page: 1, limit: 20 } }) }))
    render(<MemoryRouter><HistoryPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Kegiatan selesai')).toBeInTheDocument())
    expect(screen.getByText(/Dewasari/)).toBeInTheDocument()
    expect(screen.getByText('ODP-01')).toBeInTheDocument()
    expect(screen.getByText('1 foto')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /edit/i })).toHaveAttribute('href', '/pegawai/laporan/r1/edit')
  })
})
