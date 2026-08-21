import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DashboardPage from './DashboardPage.jsx'

describe('DashboardPage', () => {
  it('keeps reported employee and report row metrics separate', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { wajibLapor: 4, sudahMelapor: 2, belumMelapor: 2, jumlahLaporan: 5, distribusiDesa: [], distribusiTahapan: [], terbaru: [] } }) }))
    render(<DashboardPage />)
    await waitFor(() => expect(screen.getAllByText('2')).toHaveLength(2))
    expect(screen.getByText('Sudah melapor')).toBeInTheDocument()
    expect(screen.getByText('Jumlah laporan')).toBeInTheDocument()
  })
})
