import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FtthReportPanel from './FtthReportPanel.jsx'
import { ftthApi } from '../../api/ftth.js'
vi.mock('../../api/ftth.js', () => ({ ftthApi: { detail: vi.fn(), setStatus: vi.fn(), references: vi.fn(), remove: vi.fn() } }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
describe('company report detail', () => {
  it('locks corrections until reopened and uses authenticated backend attachment URLs', async () => {
    ftthApi.detail.mockResolvedValue({ id: 'r1', status: 'APPROVED', project_name: 'Project A', dokumentasi: [{ id: 'f1', original_name: 'foto.png', downloadUrl: '/api/ftth/reports/r1/attachments/f1/download' }] })
    const onChanged = vi.fn()
    render(<FtthReportPanel id="r1" onChanged={onChanged} onClose={vi.fn()} />)
    expect(await screen.findByText('Buka kembali laporan sebelum mengoreksi.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Koreksi laporan' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Perlu revisi' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Buka foto.png' }).getAttribute('href')).toContain('/api/ftth/reports/r1/attachments/f1/download')
    fireEvent.click(screen.getByRole('button', { name: 'Buka kembali' }))
    await waitFor(() => expect(ftthApi.setStatus).toHaveBeenCalledWith('r1', { status: 'PENDING', catatan_revisi: '' }))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })
})
