import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import EmployeeClusterDetailPage from './EmployeeClusterDetailPage.jsx'
import { ftthApi } from '../../api/ftth.js'

vi.mock('../../api/ftth.js', () => ({
  ftthApi: {
    clusterDetail: vi.fn(),
  },
}))

// Mock leaflet for JSDOM
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
        bindPopup: vi.fn().mockReturnValue({
          openPopup: vi.fn(),
        }),
        openPopup: vi.fn(),
      })),
      polygon: vi.fn(() => ({
        addTo: vi.fn().mockReturnThis(),
      })),
      divIcon: vi.fn(() => ({})),
    },
  }
})

describe('EmployeeClusterDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders cluster detail with map, homepass metrics, category tabs, and process list', async () => {
    ftthApi.clusterDetail.mockResolvedValue({
      id: 'cls-101',
      name: 'NET-H-004404 FTTH Open Area Rancamanyar RW 09',
      project_id: 'proj-1',
      project_name: 'Project Alpha',
      status: 'running',
      overall_progress: 4,
      homepass_target: 555,
      homepass_achieved: 555,
      latitude: -6.9856,
      longitude: 107.6042,
      categories_summary: [
        {
          id: 'sitac',
          name: 'Sitac',
          percentage: 13,
          completed: 1,
          total: 8,
          items: [
            {
              id: 'proc-1',
              process_id: 'p-1',
              name: 'Sosialisasi',
              status: 'on_progress',
              input_instruction: 'Sosialisasi ke masyarakat',
              completed_date: '2026-09-01',
              reportCount: 1,
            },
          ],
        },
        {
          id: 'impl',
          name: 'Implementasi',
          percentage: 0,
          completed: 0,
          total: 6,
          items: [],
        },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/pegawai/clusters/cls-101']}>
        <Routes>
          <Route path="/pegawai/clusters/:id" element={<EmployeeClusterDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'NET-H-004404 FTTH Open Area Rancamanyar RW 09' })).toBeInTheDocument())

    // Homepass section
    expect(screen.getByText('Homepass')).toBeInTheDocument()
    expect(screen.getByText('Target')).toBeInTheDocument()
    expect(screen.getByText('Achieved')).toBeInTheDocument()
    expect(screen.getAllByText('555')).toHaveLength(2)

    // KMZ File section
    expect(screen.getByText('KMZ/KML File')).toBeInTheDocument()
    expect(screen.getByText('KMZ file uploaded and shown on map')).toBeInTheDocument()

    // Process progress
    expect(screen.getByText('Process Progress')).toBeInTheDocument()
    expect(screen.getByText('4%')).toBeInTheDocument()
    expect(screen.getByText('1/8 completed')).toBeInTheDocument()

    // Tabs
    expect(screen.getByRole('button', { name: 'Sitac' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Implementasi' })).toBeInTheDocument()

    // Process items
    expect(screen.getByText('Sosialisasi')).toBeInTheDocument()
    expect(screen.getByText('Sosialisasi ke masyarakat')).toBeInTheDocument()
    expect(screen.getByText(/1 laporan telah dibuat/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /input hasil pekerjaan/i })).toHaveAttribute(
      'href',
      '/pegawai/laporan/new?cluster_id=cls-101&process_id=p-1'
    )
  })
})
