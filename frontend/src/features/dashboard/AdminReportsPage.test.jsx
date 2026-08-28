import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import AdminReportsPage from './AdminReportsPage.jsx'

describe('AdminReportsPage', () => {
  it('displays reports list without filter controls or export button', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          items: [
            {
              id: 'rep-1',
              tanggalKegiatan: '2026-08-22',
              keterangan: 'Pekerjaan galian',
              user: { nama: 'Pegawai A' },
              cluster: { clusterName: 'RW 01', desa: { namaDesa: 'Dewasari' } },
              pekerjaan: { namaPekerjaan: 'Penggalian' },
            },
          ],
          total: 1,
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter>
        <AdminReportsPage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('Pekerjaan galian')).toBeInTheDocument())
    
    const search = screen.getByLabelText(/cari laporan/i)
    fireEvent.change(search, { target: { value: 'Dewasari' } })
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('search=Dewasari'))).toBe(true))
    // Only the report search is exposed; legacy filters and export are absent.
    expect(screen.queryByLabelText(/dari tanggal/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/sampai tanggal/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/cari laporan/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/pekerjaan/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ekspor excel/i)).not.toBeInTheDocument()
  })
})
