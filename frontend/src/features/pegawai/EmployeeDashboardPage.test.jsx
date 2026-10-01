import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EmployeeDashboardPage from './EmployeeDashboardPage.jsx'
import { ftthApi } from '../../api/ftth.js'

vi.mock('../../api/ftth.js', () => ({
  ftthApi: {
    dashboard: vi.fn(),
  },
}))

// Mock leaflet since jsdom does not support WebGL/Canvas
vi.mock('leaflet', () => {
  const mapInstance = {
    addTo: vi.fn().mockReturnThis(),
    removeLayer: vi.fn(),
    eachLayer: vi.fn(),
    fitBounds: vi.fn(),
    invalidateSize: vi.fn(),
  }
  return {
    default: {
      map: vi.fn(() => mapInstance),
      tileLayer: vi.fn(() => ({ addTo: vi.fn().mockReturnThis() })),
      marker: vi.fn(() => ({
        addTo: vi.fn().mockReturnThis(),
        bindPopup: vi.fn().mockReturnThis(),
      })),
      divIcon: vi.fn(() => ({})),
    },
  }
})

describe('EmployeeDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard stat cards, process progress, and daily report stats', async () => {
    ftthApi.dashboard.mockResolvedValue({
      totalProjects: 2,
      totalClusters: 3,
      homepassTarget: 500,
      overallProgress: 45,
      clusters: [
        { id: 'c1', name: 'Cluster Jakarta', latitude: -6.2, longitude: 106.8, homepass_target: 200, status: 'open' },
      ],
      processProgress: [
        { id: 'p1', name: 'Sosialisasi', percentage: 75, completed: 3, total: 4 },
        { id: 'p2', name: 'BAKP', percentage: 25, completed: 1, total: 4 },
      ],
      reportStats: {
        onProgress: 5,
        selesai: 12,
        kendala: 2,
        total: 19,
      },
    })

    render(<EmployeeDashboardPage />)

    expect(screen.getByRole('status')).toHaveTextContent(/memuat ringkasan proyek/i)

    await waitFor(() => expect(screen.getByText('Total Projects')).toBeInTheDocument())
    expect(screen.getAllByText('2')).toHaveLength(2)
    expect(screen.getByText('Total Clusters')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()

    // Process progress
    expect(screen.getByText('Sosialisasi')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('BAKP')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()

    // Daily report stats
    expect(screen.getByText('On Progress')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Selesai')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Kendala')).toBeInTheDocument()
  })
})
