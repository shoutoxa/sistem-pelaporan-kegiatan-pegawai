import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ReportForm from './ReportForm.jsx'

const user = { id: 'u1', nama: 'Ayu Pegawai', role: 'PEGAWAI' }
const villages = [{ id: 'd1', namaDesa: 'Dewasari' }]
const stages = [{ id: 't1', namaTahapan: 'Pemasangan ODN', requiresNomorPerangkat: true }, { id: 't2', namaTahapan: 'Absensi Mulai', requiresNomorPerangkat: false }]

describe('ReportForm', () => {
  it('shows the device number only when the selected stage requires it and submits FormData', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'r1', nomorRw: 'RW 01' }] })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { id: 'report-1' } }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<MemoryRouter initialEntries={['/pegawai/laporan/new']}><Routes><Route path="/pegawai/laporan/new" element={<ReportForm user={user} villages={villages} stages={stages} />} /><Route path="/pegawai/laporan/:id" element={<p>success</p>} /></Routes></MemoryRouter>)

    expect(screen.getByLabelText(/pic/i)).toHaveValue('Ayu Pegawai')
    fireEvent.change(screen.getByLabelText(/desa/i), { target: { value: 'd1' } })
    await waitFor(() => expect(screen.getByRole('option', { name: 'RW 01' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/tahapan/i), { target: { value: 't1' } })
    expect(screen.getByLabelText(/nomor perangkat/i)).toBeRequired()
    fireEvent.change(screen.getByLabelText(/nomor perangkat/i), { target: { value: 'ODN-01' } })
    fireEvent.change(screen.getByLabelText(/rw/i), { target: { value: 'r1' } })
    fireEvent.change(screen.getByLabelText(/keterangan/i), { target: { value: 'Kegiatan lapangan selesai' } })
    fireEvent.change(screen.getByLabelText(/dokumentasi/i), { target: { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] } })
    fireEvent.click(screen.getByRole('button', { name: /kirim laporan/i }))

    await waitFor(() => expect(screen.getByText('success')).toBeInTheDocument())
    const body = fetchMock.mock.calls[1][1].body
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('rwId')).toBe('r1')
    expect(body.get('desaId')).toBeNull()
    expect(body.get('nomorPerangkat')).toBe('ODN-01')
  })

  it('associates canonical server validation errors with their fields without clearing the form', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'r1', nomorRw: 'RW 01' }] })
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ message: 'Data laporan tidak valid', errors: { rwId: 'RW tidak tersedia', keterangan: 'Keterangan perlu diperjelas' } }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<MemoryRouter><ReportForm user={user} villages={villages} stages={stages} /></MemoryRouter>)

    fireEvent.change(screen.getByLabelText(/desa/i), { target: { value: 'd1' } })
    await waitFor(() => expect(screen.getByRole('option', { name: 'RW 01' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/rw/i), { target: { value: 'r1' } })
    fireEvent.change(screen.getByLabelText(/tahapan/i), { target: { value: 't2' } })
    fireEvent.change(screen.getByLabelText(/keterangan/i), { target: { value: 'Kegiatan lapangan selesai' } })
    fireEvent.change(screen.getByLabelText(/dokumentasi/i), { target: { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] } })
    fireEvent.click(screen.getByRole('button', { name: /kirim laporan/i }))

    expect(await screen.findByText('RW tidak tersedia')).toBeInTheDocument()
    expect(screen.getByText('Keterangan perlu diperjelas')).toBeInTheDocument()
    expect(screen.getByLabelText(/rw/i)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/keterangan/i)).toHaveValue('Kegiatan lapangan selesai')
  })
})
