import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AdminMasterPage from './AdminMasterPage.jsx'

describe('AdminMasterPage', () => {
  it('loads every master resource and submits a new village', async () => {
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (options.method === 'POST') return { ok: true, json: async () => ({ id: 'd2', namaDesa: 'Pamalayan', isActive: true }) }
      if (String(url).endsWith('/api/admin/desa')) return { ok: true, json: async () => [{ id: 'd1', namaDesa: 'Dewasari', isActive: true }] }
      if (String(url).endsWith('/api/admin/cluster')) return { ok: true, json: async () => [] }
      if (String(url).endsWith('/api/admin/kategori')) return { ok: true, json: async () => [] }
      if (String(url).endsWith('/api/admin/pekerjaan')) return { ok: true, json: async () => [] }
      if (String(url).endsWith('/api/admin/integration/ftth/status')) return { ok: true, json: async () => ({ configured: false, categories: 0, processes: 0, lastSyncedAt: null }) }
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AdminMasterPage />)
    await waitFor(() => expect(screen.getByText('Dewasari')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Desa' }))
    fireEvent.change(screen.getByLabelText('Nama Desa'), { target: { value: 'Pamalayan' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))

    await waitFor(() => expect(fetchMock.mock.calls.some(([url, options]) => String(url).endsWith('/api/admin/desa') && options.method === 'POST' && options.body.includes('Pamalayan'))).toBe(true))
  })

  it('displays category name for pekerjaan instead of "Belum dikategorikan"', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).endsWith('/api/admin/desa')) return { ok: true, json: async () => [] }
      if (String(url).endsWith('/api/admin/cluster')) return { ok: true, json: async () => [] }
      if (String(url).endsWith('/api/admin/kategori')) return { ok: true, json: async () => [{ id: 'cat-1', namaKategori: 'IKR & Distribusi' }] }
      if (String(url).endsWith('/api/admin/pekerjaan')) return {
        ok: true,
        json: async () => [{ id: 'proc-1', namaPekerjaan: 'Penarikan Dropcore', master_category_id: 'cat-1', kategoriId: 'cat-1' }]
      }
      if (String(url).endsWith('/api/admin/integration/ftth/status')) return { ok: true, json: async () => ({ configured: true }) }
      return { ok: true, json: async () => [] }
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AdminMasterPage />)

    await waitFor(() => {
      expect(screen.getByText('Penarikan Dropcore')).toBeInTheDocument()
      expect(screen.getAllByText('IKR & Distribusi')).toHaveLength(2)
      expect(screen.queryByText('Belum dikategorikan')).not.toBeInTheDocument()
    })
  })
})

