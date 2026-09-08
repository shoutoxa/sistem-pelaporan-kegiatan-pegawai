import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import EmployeeReportSource from './EmployeeReportSource.jsx'
import { ftthApi } from '../../api/ftth.js'
vi.mock('../../api/ftth.js', () => ({ ftthApi: { status: vi.fn() } }))
vi.mock('./FtthPage.jsx', () => ({ default: ({ mode }) => <p>Company {mode}</p> }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
it('selects local only when explicitly configured', async () => {
  ftthApi.status.mockResolvedValue({ reportsSource: 'local' })
  render(<EmployeeReportSource mode="form"><p>Local form</p></EmployeeReportSource>)
  expect(await screen.findByText('Local form')).toBeInTheDocument()
})
it('selects company history without rendering legacy content', async () => {
  ftthApi.status.mockResolvedValue({ reportsSource: 'ftth' })
  render(<EmployeeReportSource mode="history"><p>Local history</p></EmployeeReportSource>)
  expect(await screen.findByText('Company history')).toBeInTheDocument()
  expect(screen.queryByText('Local history')).not.toBeInTheDocument()
})
it('does not fall back on status failure', async () => {
  ftthApi.status.mockRejectedValue(new Error('Tidak terhubung'))
  render(<EmployeeReportSource mode="form"><p>Local form</p></EmployeeReportSource>)
  expect(await screen.findByRole('alert')).toHaveTextContent('Tidak terhubung')
  expect(screen.queryByText('Local form')).not.toBeInTheDocument()
})
