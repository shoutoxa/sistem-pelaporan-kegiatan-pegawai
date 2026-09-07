import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import FtthPage from './FtthPage.jsx'
import { ftthApi } from '../../api/ftth.js'
vi.mock('../auth/AuthProvider.jsx', () => ({ useAuth: () => ({ user: { role: 'PEGAWAI' } }) }))
vi.mock('../../api/ftth.js', () => ({ ftthApi: { status: vi.fn(), references: vi.fn(), list: vi.fn(), create: vi.fn() } }))
beforeEach(() => {
  vi.clearAllMocks()
  ftthApi.status.mockResolvedValue({ enabled: true })
  ftthApi.references.mockResolvedValue({ projects: [{ id: 'p1', name: 'Project A' }, { id: 'p2', name: 'Project B' }],
    clusters: [{ id: 'c1', name: 'Cluster A', project_id: 'p1' }, { id: 'c2', name: 'Cluster B', project_id: 'p2' }],
    categories: [{ id: 'cat1', name: 'Implementasi' }, { id: 'cat2', name: 'Sitac' }],
    processes: [{ id: 'job1', name: 'Pasang tiang', master_category_id: 'cat1' }, { id: 'job2', name: 'Izin lahan', master_category_id: 'cat2' }] })
  ftthApi.list.mockResolvedValue([])
})
describe('FTTH development page', () => {
  it('shows disabled state without loading reports', async () => {
    ftthApi.status.mockResolvedValue({ enabled: false })
    render(<FtthPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('FTTH_REPORTS_ENABLED')
    expect(ftthApi.references).not.toHaveBeenCalled()
  })
  it('cascades cluster/process and hides employee admin controls', async () => {
    render(<FtthPage />)
    const project = await screen.findByLabelText('Project')
    fireEvent.change(project, { target: { value: 'p1' } })
    expect(screen.getByRole('option', { name: 'Cluster A' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Cluster B' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Cluster'), { target: { value: 'c1' } })
    fireEvent.change(project, { target: { value: 'p2' } })
    expect(screen.getByLabelText('Cluster')).toHaveValue('')
    fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'cat1' } })
    fireEvent.change(screen.getByLabelText('Pekerjaan'), { target: { value: 'job1' } })
    fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'cat2' } })
    expect(screen.getByLabelText('Pekerjaan')).toHaveValue('')
    expect(screen.queryByRole('option', { name: 'Pasang tiang' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Izin lahan' })).toBeInTheDocument()
    expect(screen.queryByText('Pemetaan akun')).not.toBeInTheDocument()
  })
})
