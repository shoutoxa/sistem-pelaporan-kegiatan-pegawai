import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AdminMasterPage from './AdminMasterPage.jsx'

describe('AdminMasterPage', () => {
  it('reads company master without requesting local lists or showing local write controls', async () => {
    const fetchMock = vi.fn(async url => {
      if (String(url).endsWith('/api/admin/master-source')) return { ok: true, json: async () => ({ source: 'ftth' }) }
      if (String(url).endsWith('/api/admin/master-ftth')) return { ok: true, json: async () => ({ projects: [{ id: 'p1', name: 'Project Perusahaan', isActive: true }], clusters: [], categories: [], processes: [] }) }
      throw new Error('Unexpected local request')
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminMasterPage />)
    expect(await screen.findByText('Project Perusahaan')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tambah Desa' })).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.every(([url]) => String(url).includes('/api/admin/master-'))).toBe(true)
  })
  it('loads every master resource and submits a new village', async () => {
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (String(url).endsWith('/api/admin/master-source')) return { ok: true, json: async () => ({ source: 'local' }) }
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
})
