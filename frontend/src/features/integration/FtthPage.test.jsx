import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import FtthPage from './FtthPage.jsx'
import { ftthApi } from '../../api/ftth.js'
const auth = vi.hoisted(() => ({ user: { role: 'PEGAWAI' } }))
vi.mock('../auth/AuthProvider.jsx', () => ({ useAuth: () => auth }))
vi.mock('../../api/ftth.js', () => ({ ftthApi: { status: vi.fn(), references: vi.fn(), list: vi.fn(), create: vi.fn() } }))
beforeEach(() => {
  vi.clearAllMocks()
  auth.user = { role: 'PEGAWAI' }
  ftthApi.status.mockResolvedValue({ enabled: true })
  ftthApi.references.mockResolvedValue({ projects: [{ id: 'p1', name: 'Project A' }, { id: 'p2', name: 'Project B' }],
    clusters: [{ id: 'c1', name: 'Cluster A', project_id: 'p1' }, { id: 'c2', name: 'Cluster B', project_id: 'p2' }],
    categories: [{ id: 'cat1', name: 'Implementasi' }, { id: 'cat2', name: 'Sitac' }],
    processes: [{ id: 'job1', name: 'Pasang tiang', master_category_id: 'cat1' }, { id: 'job2', name: 'Izin lahan', master_category_id: 'cat2' }] })
  ftthApi.list.mockResolvedValue([])
})
afterEach(() => cleanup())
describe('FTTH development page', () => {
  it('labels company login according to the authenticated session', async () => {
    auth.user.authSource = 'ftth'
    render(<FtthPage mode="history" />)
    expect(await screen.findByText(/Login FTTH •/)).toBeInTheDocument()
    expect(screen.queryByText(/Login lokal •/)).not.toBeInTheDocument()
  })
  it('loads history independently from active form references and hides write controls', async () => {
    ftthApi.list.mockResolvedValue([{ id: 'r1', project_name: 'Project A', status: 'APPROVED', tanggal_kegiatan: '2026-09-07' }])
    render(<FtthPage mode="history" />)
    expect(await screen.findByText(/2026-09-07 — Diterima/)).toBeInTheDocument()
    expect(ftthApi.references).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Project')).not.toBeInTheDocument()
    expect(screen.queryByText('Atur status')).not.toBeInTheDocument()
    expect(screen.queryByText('Koreksi')).not.toBeInTheDocument()
    expect(screen.queryByText('Hapus')).not.toBeInTheDocument()
  })
  it('submits company form as multipart without user or status fields', async () => {
    ftthApi.create.mockResolvedValue({ id: 'r1', warnings: [] })
    render(<FtthPage mode="form" />)
    fireEvent.change(await screen.findByLabelText('Project'), { target: { value: 'p1' } })
    fireEvent.change(screen.getByLabelText('Cluster'), { target: { value: 'c1' } })
    fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'cat1' } })
    fireEvent.change(screen.getByLabelText('Pekerjaan'), { target: { value: 'job1' } })
    fireEvent.change(screen.getByLabelText('Keterangan'), { target: { value: 'Pemasangan selesai' } })
    fireEvent.change(screen.getByLabelText(/Lampiran \(1/), { target: { files: [new File(['test'], 'foto.png', { type: 'image/png' })] } })
    fireEvent.submit(screen.getByRole('button', { name: 'Kirim laporan' }).closest('form'))
    await waitFor(() => expect(ftthApi.create).toHaveBeenCalledTimes(1))
    const body = ftthApi.create.mock.calls[0][0]
    expect(body.get('project_id')).toBe('p1')
    expect(body.get('dokumentasi').name).toBe('foto.png')
    expect(body.has('status')).toBe(false)
    expect(body.has('user_id')).toBe(false)
    expect(body.has('category_id')).toBe(false)
    expect(ftthApi.list).not.toHaveBeenCalled()
    expect(await screen.findByRole('status')).toHaveTextContent('tersimpan')
  })
  it('shows disabled state without loading reports', async () => {
    ftthApi.status.mockResolvedValue({ enabled: false })
    render(<FtthPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('FTTH_REPORTS_ENABLED')
    expect(ftthApi.references).not.toHaveBeenCalled()
  })
  it('cascades cluster/process and hides employee admin controls', async () => {
    render(<FtthPage />)
    const project = await screen.findByLabelText('Project')
    expect(screen.getByLabelText('Cluster')).toBeDisabled()
    expect(screen.getByLabelText('Pekerjaan')).toBeDisabled()
    fireEvent.change(project, { target: { value: 'p1' } })
    expect(screen.getByLabelText('Cluster')).toBeEnabled()
    expect(screen.getByRole('option', { name: 'Cluster A' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Cluster B' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Cluster'), { target: { value: 'c1' } })
    fireEvent.change(project, { target: { value: 'p2' } })
    expect(screen.getByLabelText('Cluster')).toHaveValue('')
    fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'cat1' } })
    expect(screen.getByLabelText('Pekerjaan')).toBeEnabled()
    fireEvent.change(screen.getByLabelText('Pekerjaan'), { target: { value: 'job1' } })
    fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'cat2' } })
    expect(screen.getByLabelText('Pekerjaan')).toHaveValue('')
    expect(screen.queryByRole('option', { name: 'Pasang tiang' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Izin lahan' })).toBeInTheDocument()
    expect(screen.queryByText('Pemetaan akun')).not.toBeInTheDocument()
  })
})
