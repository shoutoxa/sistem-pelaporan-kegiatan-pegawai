import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EmployeeHomepassPage from './EmployeeHomepassPage.jsx'
import { ftthApi } from '../../api/ftth.js'

vi.mock('../../api/ftth.js', () => ({
  ftthApi: {
    clusters: vi.fn(),
  },
}))

describe('EmployeeHomepassPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders view-only homepass metrics and cluster progress', async () => {
    ftthApi.clusters.mockResolvedValue([
      {
        id: 'cls-1',
        name: 'Cluster Gamma',
        project_name: 'Project 1',
        homepass_target: 200,
        homepass_achieved: 100,
        status: 'open',
      },
    ])

    render(<EmployeeHomepassPage />)

    await waitFor(() => expect(screen.getByText('Cluster Gamma')).toBeInTheDocument())
    expect(screen.getByText('Total Target Homepass')).toBeInTheDocument()
    expect(screen.getByText('Total Homepass Tercapai')).toBeInTheDocument()
    expect(screen.getAllByText('50%')).toHaveLength(2)

    // Ensure no add or edit buttons exist
    expect(screen.queryByRole('button', { name: /tambah/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })
})
