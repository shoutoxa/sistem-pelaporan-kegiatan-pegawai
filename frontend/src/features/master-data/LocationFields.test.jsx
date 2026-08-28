import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import LocationFields from './LocationFields.jsx'

describe('LocationFields', () => {
  it('disables Cluster before Desa, loads dependent Cluster, and clears Cluster on Desa change', async () => {
    const onChange = vi.fn()
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'd1', namaDesa: 'Dewasari' }, { id: 'd2', namaDesa: 'Pamalayan' }] })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'c1', clusterName: 'Cluster 01' }] })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'c2', clusterName: 'Cluster 02' }] }))

    render(<LocationFields value={{ desaId: '', clusterId: '' }} onChange={onChange} errors={{}} />)
    expect(screen.getByLabelText(/cluster/i)).toBeDisabled()

    await waitFor(() => expect(screen.getByRole('option', { name: 'Dewasari' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/desa/i), { target: { value: 'd1' } })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Cluster 01' })).toBeInTheDocument())
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/master/desa/d1/cluster', expect.anything())

    fireEvent.change(screen.getByLabelText(/desa/i), { target: { value: 'd2' } })
    expect(onChange).toHaveBeenLastCalledWith({ desaId: 'd2', clusterId: '' })
  })
})
