import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ReportDetailPage from './ReportDetailPage.jsx'

describe('ReportDetailPage', () => {
  it('renders signed URL documentation gallery', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { id: 'r1', keterangan: 'Selesai', canEdit: true, user: { nama: 'Ayu' }, createdAt: '2026-08-22T03:00:00Z', dokumentasi: [{ signedUrl: 'https://signed.test/photo.jpg', originalName: 'photo.jpg' }] } }) }))
    render(<MemoryRouter initialEntries={['/pegawai/laporan/r1']}><Routes><Route path="/pegawai/laporan/:id" element={<ReportDetailPage />} /></Routes></MemoryRouter>)
    await waitFor(() => expect(screen.getByAltText('photo.jpg')).toHaveAttribute('src', 'https://signed.test/photo.jpg'))
    expect(screen.getByRole('link', { name: /edit laporan/i })).toHaveAttribute('href', '/pegawai/laporan/r1/edit')
  })

  it('opens attachment modal when clicking on the image and allows closing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'r2',
          keterangan: 'Pekerjaan SITAC selesai',
          canEdit: false,
          user: { nama: 'Budi' },
          createdAt: '2026-08-22T03:00:00Z',
          dokumentasi: [
            { id: 'd1', signedUrl: '/uploads/sitac1.png', originalName: 'sitac1.png' },
            { id: 'd2', signedUrl: '/uploads/sitac2.png', originalName: 'sitac2.png' },
          ],
        },
      }),
    }))

    render(
      <MemoryRouter initialEntries={['/pegawai/laporan/r2']}>
        <Routes>
          <Route path="/pegawai/laporan/:id" element={<ReportDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByAltText('sitac1.png')).toBeInTheDocument())

    // Direct link to open in new tab
    const openLinks = screen.getAllByRole('link', { name: /buka/i })
    expect(openLinks[0]).toHaveAttribute('target', '_blank')
    expect(openLinks[0]).toHaveAttribute('href', 'https://ftth.digitak.id/uploads/sitac1.png')

    // Click on the figure / image opens the modal
    fireEvent.click(screen.getByAltText('sitac1.png'))
    expect(screen.getByRole('dialog', { name: /lampiran dokumentasi/i })).toBeInTheDocument()
    expect(screen.getByText('Berkas 1 dari 2')).toBeInTheDocument()

    // Next button advances to next attachment
    fireEvent.click(screen.getByRole('button', { name: /selanjutnya/i }))
    expect(screen.getByText('Berkas 2 dari 2')).toBeInTheDocument()

    // Close button dismisses modal
    fireEvent.click(screen.getByRole('button', { name: /tutup pratinjau/i }))
    expect(screen.queryByRole('dialog', { name: /lampiran dokumentasi/i })).not.toBeInTheDocument()
  })
})
