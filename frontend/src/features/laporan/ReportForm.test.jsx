import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ReportForm from './ReportForm.jsx'

const user = { id: 'u1', nama: 'Ayu Pegawai', role: 'PEGAWAI' }
const villages = [{ id: 'd1', namaDesa: 'Dewasari' }]
const categories = [{ id: 'k1', namaKategori: 'Implementasi' }]
const jobs = [{ id: 'j1', kategoriId: 'k1', namaPekerjaan: 'Pemasangan ODN', instruksiDokumentasi: 'Foto perangkat dan label nomor harus terbaca.' }, { id: 'j2', kategoriId: 'k1', namaPekerjaan: 'Absensi Mulai' }]

describe('ReportForm', () => {
  beforeEach(() => localStorage.clear())

  it('submits FormData without requiring device number', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'c1', clusterName: 'RW 01' }] })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { id: 'report-1' } }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<MemoryRouter initialEntries={['/pegawai/laporan/new']}><Routes><Route path="/pegawai/laporan/new" element={<ReportForm user={user} villages={villages} jobs={jobs} categories={categories} />} /><Route path="/pegawai/laporan/:id" element={<p>success</p>} /></Routes></MemoryRouter>)

    fireEvent.change(screen.getByLabelText(/desa/i), { target: { value: 'd1' } })
    await waitFor(() => expect(screen.getByRole('option', { name: 'RW 01' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/kategori pekerjaan/i), { target: { value: 'k1' } })
    fireEvent.change(screen.getByLabelText(/^pekerjaan$/i), { target: { value: 'j1' } })
    expect(screen.getByLabelText(/nomor perangkat/i)).not.toBeRequired()
    fireEvent.change(screen.getByLabelText(/rw/i), { target: { value: 'c1' } })
    fireEvent.change(screen.getByLabelText(/keterangan/i), { target: { value: 'Kegiatan lapangan selesai' } })
    fireEvent.change(screen.getByLabelText(/dokumentasi/i), { target: { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] } })
    fireEvent.click(screen.getByRole('button', { name: /kirim laporan/i }))

    await waitFor(() => expect(screen.getByText('success')).toBeInTheDocument())
    expect(localStorage.getItem('sistem-pelaporan:report-draft:v1:u1')).toBeNull()
    const body = fetchMock.mock.calls[1][1].body
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('clusterId')).toBe('c1')
    expect(body.get('nomorPerangkat')).toBe('')
  })

  it('associates canonical server validation errors with their fields without clearing the form', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'c1', clusterName: 'RW 01' }] })
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ message: 'Data laporan tidak valid', errors: { clusterId: 'Cluster tidak tersedia', keterangan: 'Keterangan perlu diperjelas' } }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<MemoryRouter><ReportForm user={user} villages={villages} jobs={jobs} categories={categories} /></MemoryRouter>)

    fireEvent.change(screen.getByLabelText(/desa/i), { target: { value: 'd1' } })
    await waitFor(() => expect(screen.getByRole('option', { name: 'RW 01' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/kategori pekerjaan/i), { target: { value: 'k1' } })
    fireEvent.change(screen.getByLabelText(/rw/i), { target: { value: 'c1' } })
    fireEvent.change(screen.getByLabelText(/^pekerjaan$/i), { target: { value: 'j2' } })
    fireEvent.change(screen.getByLabelText(/keterangan/i), { target: { value: 'Kegiatan lapangan selesai' } })
    fireEvent.change(screen.getByLabelText(/dokumentasi/i), { target: { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] } })
    fireEvent.click(screen.getByRole('button', { name: /kirim laporan/i }))

    expect(await screen.findByText('Cluster tidak tersedia')).toBeInTheDocument()
    expect(screen.getByText('Keterangan perlu diperjelas')).toBeInTheDocument()
    expect(screen.getByLabelText(/rw/i)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/keterangan/i)).toHaveValue('Kegiatan lapangan selesai')
  })

  it('restores a versioned mobile draft and shows documentation guidance for the selected stage', async () => {
    localStorage.setItem('sistem-pelaporan:report-draft:v1:u1', JSON.stringify({
      tanggalKegiatan: '2026-08-22',
      desaId: 'd1',
      clusterId: 'c1',
      kategoriId: 'k1',
      pekerjaanId: 'j1',
      keterangan: 'Pemasangan selesai di sisi utara',
      nomorPerangkat: 'ODN-22',
    }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: 'c1', clusterName: 'RW 01' }] }))

    render(<MemoryRouter><ReportForm user={user} villages={villages} jobs={jobs} categories={categories} /></MemoryRouter>)

    expect(screen.getByRole('status', { name: /draf laporan/i })).toHaveTextContent(/draf sebelumnya dipulihkan/i)
    expect(screen.getByLabelText(/keterangan/i)).toHaveValue('Pemasangan selesai di sisi utara')
    expect(screen.getByLabelText(/nomor perangkat/i)).toHaveValue('ODN-22')
    expect(screen.getByText('Foto perangkat dan label nomor harus terbaca.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('option', { name: 'RW 01' })).toBeInTheDocument())
  })

  it('shows only work belonging to the selected category', () => {
    const categorizedJobs = [
      { id: 'j1', kategoriId: 'k1', namaPekerjaan: 'Implementasi' },
      { id: 'j2', kategoriId: 'k2', namaPekerjaan: 'Survey' },
    ]
    const categoryRows = [
      { id: 'k1', namaKategori: 'Implementasi' },
      { id: 'k2', namaKategori: 'Sitac' },
    ]
    render(<MemoryRouter><ReportForm user={user} villages={villages} jobs={categorizedJobs} categories={categoryRows} /></MemoryRouter>)

    expect(screen.getByLabelText(/^pekerjaan$/i)).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/kategori pekerjaan/i), { target: { value: 'k2' } })

    const jobSelect = screen.getByLabelText(/^pekerjaan$/i)
    expect(within(jobSelect).getByRole('option', { name: 'Survey' })).toBeInTheDocument()
    expect(within(jobSelect).queryByRole('option', { name: 'Implementasi' })).not.toBeInTheDocument()
  })

  it('renders without loop when no optional props are provided (EmployeeReportRoute scenario)', async () => {
    const fetchMock = vi.fn().mockImplementation((url) => {
      if (String(url).includes('/api/master/project')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 'p1', name: 'Desa Merdeka' }] })
      }
      if (String(url).includes('/api/master/category')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 'c1', name: 'FTTH' }] })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter>
        <ReportForm user={user} />
      </MemoryRouter>
    )

    // Verify it renders the form inputs cleanly
    expect(screen.getByLabelText(/desa \/ project/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Desa Merdeka' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'FTTH' })).toBeInTheDocument()
    })
  })
})

