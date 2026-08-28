import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import DashboardPage from './DashboardPage.jsx'

describe('DashboardPage', () => {
  it('renders metrics without redundant Jumlah laporan card', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url) => {
      if (String(url).includes('/api/admin/master')) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: {
            wajibLapor: 4,
            sudahMelapor: 2,
            belumMelapor: 2,
            jumlahLaporan: 5,
            distribusiDesa: [{ namaDesa: 'Dewasari', jumlah: 3 }],
            distribusiTahapan: [{ namaTahapan: 'Pengecoran', jumlah: 3 }],
            terbaru: [],
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
    // Redundant 'Jumlah laporan' card MUST be removed
    expect(screen.queryByText('Jumlah laporan')).not.toBeInTheDocument()
  })
})
