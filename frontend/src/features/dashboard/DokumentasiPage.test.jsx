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
      mimeType: 'image/png',
      laporanId: 'rep-1',
      tanggalKegiatan: '2026-08-22',
      keterangan: 'Foto pengerjaan ODN',
      project: { id: 'p1', name: 'Project Rancamanyar' },
      cluster: { id: 'c1', name: 'RW 02' },
      process: { id: 'proc1', name: 'IKR' },
    }],
    total: 1,
  },
}

describe('DokumentasiPage', () => {
  it('filters by Project, Cluster, and Kategori and renders folder view', async () => {
    const fetchMock = vi.fn().mockImplementation((url) => {
      const requestUrl = String(url)
      if (requestUrl.endsWith('/api/master/project')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 'p1', name: 'Project Rancamanyar' }] })
      }
      if (requestUrl.endsWith('/api/master/category')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 'proc1', name: 'IKR' }] })
      }
      if (requestUrl.includes('/api/master/project/p1/cluster')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 'c1', name: 'RW 02' }] })
      }
      return Promise.resolve({ ok: true, json: async () => documentationResponse })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<MemoryRouter><DokumentasiPage /></MemoryRouter>)

    await waitFor(() => expect(screen.getByText('Dokumentasi Kegiatan')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/project/i), { target: { value: 'p1' } })
    await waitFor(() => expect(screen.getByRole('option', { name: 'RW 02' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/cluster/i), { target: { value: 'c1' } })
    fireEvent.change(screen.getByLabelText(/kategori/i), { target: { value: 'proc1' } })
    fireEvent.click(screen.getByRole('button', { name: /tampilkan/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/dokumentasi?projectId=p1&clusterId=c1'),
      expect.any(Object),
    ))
  })
})
