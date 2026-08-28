import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import DashboardPage from './DashboardPage.jsx'

describe('DashboardPage', () => {
  it('renders metrics without redundant Jumlah laporan card', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: {
            wajibLapor: 4,
            sudahMelapor: 2,
            belumMelapor: 2,
            jumlahLaporan: 5,
            distribusiDesa: [{ namaDesa: 'Dewasari', jumlah: 3 }],
            distribusiPekerjaan: [{ namaPekerjaan: 'Pengecoran', jumlah: 3 }],
            terbaru: [{
              id: 'r1',
              user: { nama: 'Ayu' },
              pekerjaan: { namaPekerjaan: 'Pengecoran' },
              cluster: { clusterName: 'RW 01', desa: { namaDesa: 'Dewasari' } },
              keterangan: 'Kegiatan selesai',
            }],
          },
        }),
      })
    }))

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('Sudah melapor')).toBeInTheDocument())
    expect(screen.getByText('Pegawai wajib lapor')).toBeInTheDocument()
    expect(screen.getByText('Belum melapor')).toBeInTheDocument()
    expect(screen.getByText('Ayu')).toBeInTheDocument()
    expect(screen.queryByLabelText(/filter dashboard/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/dashboard-search/i)).not.toBeInTheDocument()
    // Redundant 'Jumlah laporan' card MUST be removed
    expect(screen.queryByText('Jumlah laporan')).not.toBeInTheDocument()
  })
})
