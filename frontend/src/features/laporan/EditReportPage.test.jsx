import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import EditReportPage from './EditReportPage.jsx'

describe('EditReportPage', () => {
  it('loads an editable report and sends allowed fields without replacing photos', async () => {
    const fetchMock = vi.fn(async (url, options) => {
      if (String(url).includes('/master/tahapan')) return { ok: true, json: async () => [{ id: 't1', namaTahapan: 'ODN', requiresNomorPerangkat: false }] }
      if (String(url).includes('/master/desa/d1/rw')) return { ok: true, json: async () => [{ id: 'rw1', nomorRw: 'RW 01' }] }
      if (options?.method === 'PUT') return { ok: true, json: async () => ({ data: { id: 'r1' } }) }
      return { ok: true, json: async () => ({ data: { id: 'r1', canEdit: true, tanggalKegiatan: '2026-08-22', keterangan: 'Keterangan lama', rwId: 'rw1', tahapanId: 't1', rw: { id: 'rw1', nomorRw: 'RW 01', desa: { id: 'd1', namaDesa: 'Dewasari' } }, tahapan: { id: 't1', namaTahapan: 'ODN' }, dokumentasi: [{ id: 'f1' }] } }) }
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<MemoryRouter initialEntries={['/pegawai/laporan/r1/edit']}><Routes><Route path="/pegawai/laporan/:id/edit" element={<EditReportPage />} /><Route path="/pegawai/laporan/:id" element={<p>saved</p>} /></Routes></MemoryRouter>)

    await waitFor(() => expect(screen.getByDisplayValue('Keterangan lama')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/keterangan/i), { target: { value: 'Keterangan diperbarui' } })
    fireEvent.click(screen.getByRole('button', { name: /simpan perubahan/i }))

    await waitFor(() => expect(fetchMock.mock.calls.some(([url, options]) => String(url).endsWith('/api/laporan/r1') && options?.method === 'PUT' && !String(options.body).includes('dokumentasi'))).toBe(true))
  })
})
