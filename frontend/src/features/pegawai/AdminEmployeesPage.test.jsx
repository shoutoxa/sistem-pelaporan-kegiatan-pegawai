import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AdminEmployeesPage from './AdminEmployeesPage.jsx'

describe('AdminEmployeesPage', () => {
  it('renders employee status from the admin API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ id: 'u1', nama: 'Ayu', username: 'ayu', isActive: true }] }) }))
    render(<AdminEmployeesPage />)
    await waitFor(() => expect(screen.getByText('Ayu')).toBeInTheDocument())
    expect(screen.getByText('Aktif')).toBeInTheDocument()
  })
})
