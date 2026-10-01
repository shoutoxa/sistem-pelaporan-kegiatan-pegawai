import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EmployeeProjectsPage from './EmployeeProjectsPage.jsx'
import { ftthApi } from '../../api/ftth.js'

vi.mock('../../api/ftth.js', () => ({
  ftthApi: {
    projects: vi.fn(),
    projectDetail: vi.fn(),
  },
}))

describe('EmployeeProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders view-only projects list and opens detail modal without write controls', async () => {
    ftthApi.projects.mockResolvedValue([
      {
        id: 'proj-1',
        name: 'Project Fiber 1',
        spk_number: 'SPK/001/2026',
        spk_date: '2026-01-10',
        cluster_count: 2,
        homepass_target: 300,
        homepass_achieved: 150,
        status: 'open',
      },
    ])

    ftthApi.projectDetail.mockResolvedValue({
      id: 'proj-1',
      name: 'Project Fiber 1',
      spk_number: 'SPK/001/2026',
      spk_date: '2026-01-10',
      description: 'Pemasangan kabel fiber optik',
      clusters: [
        { id: 'c1', name: 'Cluster Alpha', homepass_target: 150, homepass_achieved: 100, status: 'open' },
      ],
    })

    render(<EmployeeProjectsPage />)

    await waitFor(() => expect(screen.getByText('Project Fiber 1')).toBeInTheDocument())
    expect(screen.getByText('SPK/001/2026')).toBeInTheDocument()
    expect(screen.getAllByText('2 cluster')).toHaveLength(2)

    // Ensure no add or edit buttons exist
    expect(screen.queryByRole('button', { name: /tambah/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /hapus/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()

    // Open detail
    const detailBtn = screen.getByRole('button', { name: 'Detail' })
    fireEvent.click(detailBtn)

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Detail project' })).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Project Fiber 1' })).toBeInTheDocument()
    expect(screen.getByText('Cluster Alpha')).toBeInTheDocument()
    expect(screen.getByText('Pemasangan kabel fiber optik')).toBeInTheDocument()
  })
})
