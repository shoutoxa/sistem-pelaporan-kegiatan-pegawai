import { render, screen, waitFor } from '@testing-library/react'
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
})
