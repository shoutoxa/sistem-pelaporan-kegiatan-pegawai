import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { FtthDocumentationPage } from './FtthDocumentationPage.jsx'
import { dashboardApi } from '../../api/dashboard.js'
vi.mock('../../api/dashboard.js', () => ({ dashboardApi: { listDocumentation: vi.fn() } }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
it('filters project/cluster and prints only after image loading, with PDF as a link', async () => {
  const base = { reportId: 'r1', projectId: 'p1', clusterId: 'c1', processId: 'j1', projectName: 'Project A', clusterName: 'Cluster A', processName: 'Sitac', downloadUrl: '/api/ftth/reports/r1/attachments/a/download' }
  dashboardApi.listDocumentation.mockResolvedValue({ data: { source: 'ftth', items: [{ ...base, id: 'a', originalName: 'foto.png', mimeType: 'image/png' }, { ...base, id: 'b', originalName: 'izin.pdf', mimeType: 'application/pdf' }], options: { projects: [{ id: 'p1', name: 'Project A' }], clusters: [{ id: 'c1', name: 'Cluster A', projectId: 'p1' }], processes: [{ id: 'j1', name: 'Sitac' }] } } })
  render(<FtthDocumentationPage />)
  const photo = await screen.findByAltText('foto.png')
  expect(photo).toHaveAttribute('crossorigin', 'use-credentials')
  expect(screen.getByText('Cetak / Simpan PDF')).toBeDisabled()
  expect(screen.getByText('Dokumen: izin.pdf')).toBeInTheDocument()
  fireEvent.load(photo)
  expect(screen.getByText('Cetak / Simpan PDF')).toBeEnabled()
  fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'p1' } })
  fireEvent.change(screen.getByLabelText('Cluster'), { target: { value: 'c1' } })
  fireEvent.click(screen.getByText('Tampilkan'))
  await waitFor(() => expect(dashboardApi.listDocumentation).toHaveBeenCalledWith({ projectId: 'p1', clusterId: 'c1', pekerjaanId: '' }))
})
