import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import DokumentasiPage from './DokumentasiPage.jsx'

describe('DokumentasiPage', () => {
  it('renders documentation gallery grouped by Cluster and Pekerjaan', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url) => {
      if (String(url).includes('/api/admin/master') || String(url).includes('/api/master')) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: {
            items: [
              {
                id: 'doc-1',
                storagePath: 'path/to/img.png',
                signedUrl: 'https://example.com/img.png',
                originalName: 'foto1.png',
                laporanId: 'rep-1',
                tanggalKegiatan: '2026-08-22',
                keterangan: 'Foto pengerjaan ODN',
                pegawai: { nama: 'Budi' },
                desa: { namaDesa: 'Handapherang' },
                cluster: { clusterName: 'Cluster 02', desa: { namaDesa: 'Handapherang' } },
                pekerjaan: { namaPekerjaan: 'Pemasangan ODN' },
              },
            ],
            total: 1,
          },
        }),
      })
    }))

    render(
      <MemoryRouter>
        <DokumentasiPage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: /Handapherang/i })).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: /Pemasangan ODN/i })).toBeInTheDocument()
    expect(screen.getByText('Foto pengerjaan ODN')).toBeInTheDocument()
  })
})
