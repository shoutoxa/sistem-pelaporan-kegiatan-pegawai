import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import EmployeeClusterDetailPage from './EmployeeClusterDetailPage.jsx'
import L from 'leaflet'
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
    remove: vi.fn(),
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
  it('preserves zero values, does not invent boundaries, and hides reporting for completed jobs', async () => {
    ftthApi.clusterDetail.mockResolvedValue({ id: 'c1', name: '<img src=x onerror=alert(1)>', project_name: 'Project',
      latitude: 0, longitude: 0, homepass_target: 0, homepass_achieved: 0, overall_progress: 0,
      categories_summary: [{ id: 'cat', name: 'Kategori', total: 1, completed: 1,
        items: [{ id: 'job', name: 'Selesai job', status: 'completed' }] }] })
    const view = render(<MemoryRouter><EmployeeClusterDetailPage /></MemoryRouter>)
    await screen.findByRole('heading', { name: '<img src=x onerror=alert(1)>' })
    expect(screen.getAllByText('0')).toHaveLength(2)
    expect(screen.queryByText('555')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /isi laporan/i })).not.toBeInTheDocument()
    expect(L.polygon).not.toHaveBeenCalled()
    const popup = L.marker.mock.results.at(-1).value.bindPopup.mock.calls[0][0]
    expect(popup.textContent).toBe('<img src=x onerror=alert(1)>')
    expect(popup.querySelector('img')).toBeNull()
    view.unmount()
    expect(L.map.mock.results.at(-1).value.remove).toHaveBeenCalled()
  })
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
    expect(screen.getByText('Tercapai')).toBeInTheDocument()
    expect(screen.getAllByText('555')).toHaveLength(2)

    // KMZ File section
    expect(screen.getByText('Peta cluster')).toBeInTheDocument()
    expect(screen.queryByText('KMZ file uploaded and shown on map')).not.toBeInTheDocument()

    // Process progress
    expect(screen.getByText('Progres pekerjaan saya')).toBeInTheDocument()
    expect(screen.getByText('4%')).toBeInTheDocument()
    expect(screen.getByText('1/8 selesai')).toBeInTheDocument()

    // Tabs
    expect(screen.getByRole('button', { name: 'Sitac' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Implementasi' })).toBeInTheDocument()

    // Process items
    expect(screen.getByText('Sosialisasi')).toBeInTheDocument()
    expect(screen.getByText('Sosialisasi ke masyarakat')).toBeInTheDocument()
    expect(screen.getByText(/1 laporan Anda/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /isi laporan pekerjaan/i })).toHaveAttribute(
      'href',
      '/pegawai/laporan/new?cluster_id=cls-101&process_id=p-1'
    )
  })
})
