import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import DokumentasiPage from './DokumentasiPage.jsx'

const documentationResponse = {
  data: {
    items: [{
      id: 'doc-1',
      storagePath: 'path/to/img.png',
      signedUrl: 'https://example.com/img.png',
      originalName: 'foto1.png',
      laporanId: 'rep-1',
      tanggalKegiatan: '2026-08-22',
      keterangan: 'Foto pengerjaan ODN',
      desa: { id: 'd1', namaDesa: 'Handapherang' },
      cluster: { id: 'c1', clusterName: 'RW 02', desa: { id: 'd1', namaDesa: 'Handapherang' } },
      pekerjaan: { id: 'p1', namaPekerjaan: 'Pemasangan ODN' },
    }],
    total: 1,
  },
}

describe('DokumentasiPage', () => {
  it('filters by Desa, RW, and Pekerjaan and renders an A4-style preview', async () => {
    const fetchMock = vi.fn().mockImplementation((url) => {
      const requestUrl = String(url)
      if (requestUrl.endsWith('/api/master/desa')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 'd1', namaDesa: 'Handapherang' }] })
      }
      if (requestUrl.endsWith('/api/master/pekerjaan')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 'p1', namaPekerjaan: 'Pemasangan ODN' }] })
      }
      if (requestUrl.includes('/api/master/desa/d1/cluster')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 'c1', clusterName: 'RW 02' }] })
      }
      return Promise.resolve({ ok: true, json: async () => documentationResponse })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<MemoryRouter><DokumentasiPage /></MemoryRouter>)

    await waitFor(() => expect(screen.getByText('PHOTO DOCUMENTATION')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Desa'), { target: { value: 'd1' } })
    await waitFor(() => expect(screen.getByRole('option', { name: 'RW 02' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('RW / Cluster'), { target: { value: 'c1' } })
    fireEvent.change(screen.getByLabelText('Pekerjaan'), { target: { value: 'p1' } })
    fireEvent.click(screen.getByRole('button', { name: /tampilkan/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/dokumentasi?desaId=d1&clusterId=c1&pekerjaanId=p1'),
      expect.any(Object),
    ))
    expect(screen.getByText('Foto pengerjaan ODN')).toBeInTheDocument()
    expect(screen.getByText('Halaman 1 dari 1')).toBeInTheDocument()
  })
})
