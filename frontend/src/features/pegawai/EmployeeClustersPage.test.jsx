import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EmployeeClustersPage from './EmployeeClustersPage.jsx'
import { ftthApi } from '../../api/ftth.js'

vi.mock('../../api/ftth.js', () => ({
  ftthApi: {
    clusters: vi.fn(),
    clusterDetail: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

describe('EmployeeClustersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders cluster cards with categories and progress and navigates on click', async () => {
    ftthApi.clusters.mockResolvedValue([
      {
        id: 'cls-1',
        name: 'Cluster Beta',
        project_name: 'Project 1',
        pic_name: 'Nopan',
        homepass_target: 100,
        homepass_achieved: 80,
        overall_progress: 35,
        status: 'open',
        categories_summary: [
          {
            id: 'sitac',
            name: 'Sitac',
            percentage: 50,
            completed: 4,
            total: 8,
            items: [{ id: 'proc-1', name: 'Sosialisasi', status: 'completed' }],
          },
        ],
      },
    ])

    render(<EmployeeClustersPage />)

    await waitFor(() => expect(screen.getByText('Cluster Beta')).toBeInTheDocument())
    expect(screen.getByText('Project 1')).toBeInTheDocument()
    expect(screen.getByText('Overall Progress')).toBeInTheDocument()
    expect(screen.getByText('35%')).toBeInTheDocument()
    expect(screen.getByText('HP: 80 / 100')).toBeInTheDocument()
    expect(screen.getByText('Sosialisasi')).toBeInTheDocument()

    // Clicking card triggers navigation
    const card = screen.getByRole('button', { name: /cluster beta/i })
    fireEvent.click(card)
    expect(mockNavigate).toHaveBeenCalledWith('/pegawai/clusters/cls-1')
  })
})

