import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MasterTable from './MasterTable.jsx'

describe('MasterTable', () => {
  it('renders rows, active status, and action callbacks', () => {
    render(<MasterTable title="Desa" columns={[{ key: 'namaDesa', label: 'Nama Desa' }]} rows={[{ id: 'd1', namaDesa: 'Dewasari', isActive: true }]} onCreate={vi.fn()} onEdit={vi.fn()} onToggleActive={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Desa' })).toBeInTheDocument()
    expect(screen.getByText('Dewasari')).toBeInTheDocument()
    expect(screen.getByText('Aktif')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tambah/i })).toBeInTheDocument()
  })
})
