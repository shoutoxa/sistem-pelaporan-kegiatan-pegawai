import { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import FtthFilePicker, { fileSelectionError } from './FtthFilePicker.jsx'
import FtthAttachments, { attachmentUrl } from './FtthAttachments.jsx'
import ClusterReportingStatus from './ClusterReportingStatus.jsx'
import { groupDocumentation } from './DocumentationFolders.jsx'
import { reportDraftKey, newReportFields, saveReportDraft, readReportDraft, reconcileReportFields } from './reportDraft.js'
import { ftthApi } from '../../api/ftth.js'
vi.mock('../../api/ftth.js', () => ({ ftthApi: { userClusters: vi.fn(), userReportStatus: vi.fn() } }))
beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })
afterEach(() => vi.restoreAllMocks())

it('isolates drafts by account and stores only permitted fields', () => {
  const key = reportDraftKey({ id: 'employee-a', authSource: 'ftth' })
  saveReportDraft(key, { ...newReportFields(), keterangan: 'Draf A', password: 'not-stored', dokumentasi: ['not-stored'] })
  expect(readReportDraft(key).keterangan).toBe('Draf A')
  expect(readReportDraft(reportDraftKey({ id: 'employee-b', authSource: 'ftth' }))).toBeNull()
  expect(localStorage.getItem(key)).not.toContain('not-stored')
  saveReportDraft(key, newReportFields())
  expect(localStorage.getItem(key)).toBeNull()
})
it('handles malformed/unavailable storage and invalid reference IDs safely', () => {
  localStorage.setItem('draft', '{broken')
  expect(readReportDraft('draft')).toBeNull()
  const fields = reconcileReportFields({ ...newReportFields(), project_id: 'deleted', cluster_id: 'wrong', keterangan: 'Keep text' }, { projects: [], clusters: [], categories: [], processes: [] })
  expect(fields).toMatchObject({ project_id: '', cluster_id: '', keterangan: 'Keep text' })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  expect(saveReportDraft('draft', { ...newReportFields(), keterangan: 'Still editable' })).toBe(false)
})
it('enforces existing upload count, size and formats', () => {
  const pdf = new File(['pdf'], 'a.pdf', { type: 'application/pdf' })
  expect(fileSelectionError([pdf])).toBe('')
  expect(fileSelectionError(Array(6).fill(pdf))).toContain('5')
  expect(fileSelectionError([{ type: 'image/png', size: 10000001 }])).toContain('10 MB')
  expect(fileSelectionError([new File(['zip'], 'a.zip', { type: 'application/zip' })])).toContain('Format')
})
it('previews, removes and revokes file URLs, including drag/drop', () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL')
  function Picker() { const [files, setFiles] = useState([]); return <FtthFilePicker files={files} onChange={setFiles} /> }
  const { container } = render(<Picker />)
  fireEvent.drop(container.querySelector('.ftth-dropzone'), { dataTransfer: { files: [new File(['png'], 'a.png', { type: 'image/png' })] } })
  expect(screen.getByAltText('Pratinjau a.png')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Hapus a.png' }))
  expect(screen.queryByAltText('Pratinjau a.png')).not.toBeInTheDocument()
  expect(revoke).toHaveBeenCalled()
})
it('opens authorized previews, navigates and closes without upstream URLs', () => {
  const items = ['a', 'b'].map(id => ({ id, original_name: `${id}.png`, mime_type: 'image/png', downloadUrl: `/api/ftth/reports/r1/attachments/${id}/download` }))
  expect(attachmentUrl({ downloadUrl: 'https://external.invalid/file' })).toBeNull()
  render(<FtthAttachments items={items} />)
  fireEvent.click(screen.getByRole('button', { name: 'Pratinjau a.png' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByAltText('a.png').getAttribute('src')).toContain('/api/ftth/reports/r1/attachments/a/download')
  fireEvent.click(screen.getByRole('button', { name: 'Berikutnya' }))
  expect(screen.getByAltText('b.png')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Tutup' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('keeps unavailable daily status unknown and only selects matching authorized IDs', async () => {
  ftthApi.userClusters.mockResolvedValue([{ id: 'c1', name: 'RW 01', project_id: 'p1' }, { id: 'c2', name: 'RW 02', project_id: 'p2' }])
  ftthApi.userReportStatus.mockRejectedValue(new Error('offline'))
  const select = vi.fn()
  render(<ClusterReportingStatus userId="employee" selectableClusters={[{ id: 'c1', project_id: 'p1' }, { id: 'c2', project_id: 'wrong' }]} onSelect={select} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Status harian belum tersedia')
  expect(screen.queryByText('Belum lapor')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Pilih cluster RW 02' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Pilih cluster RW 01' }))
  expect(select).toHaveBeenCalledWith({ id: 'c1', project_id: 'p1' })
})
it('shows current-day status per assigned cluster', async () => {
  ftthApi.userClusters.mockResolvedValue([{ id: 'c1', name: 'RW 01', project_id: 'p1' }])
  ftthApi.userReportStatus.mockResolvedValue({ user_id: 'employee', wajib_lapor: true, tanggal: newReportFields().tanggal_kegiatan, clusters: [{ cluster_id: 'c1', sudah_lapor: true, laporan_status: 'PENDING' }] })
  render(<ClusterReportingStatus userId="employee" />)
  await waitFor(() => expect(screen.getByText('Sudah lapor · Menunggu')).toBeInTheDocument())
})
it('never merges folders with identical display names but different IDs', () => {
  const common = { projectName: 'Same', clusterName: 'Same', processName: 'Same', processId: 'j' }
  const groups = groupDocumentation([{ ...common, projectId: 'p1', clusterId: 'c1' }, { ...common, projectId: 'p2', clusterId: 'c2' }, { ...common, projectId: 'p1', clusterId: 'c3' }])
  expect(groups).toHaveLength(2)
  expect(groups[0].clusters).toHaveLength(2)
})
