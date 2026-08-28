import { render, screen, waitFor } from '@testing-library/react'
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
              rw: { nomorRw: 'RW 01', desa: { namaDesa: 'Dewasari' } },
              tahapan: { namaTahapan: 'Penggalian' },
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
    
    // Verify filters are removed completely
    expect(screen.queryByLabelText(/dari tanggal/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/sampai tanggal/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/pegawai/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/tahapan/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ekspor excel/i)).not.toBeInTheDocument()
  })
})
