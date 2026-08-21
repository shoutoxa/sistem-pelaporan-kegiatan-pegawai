import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import LocationFields from './LocationFields.jsx'

describe('LocationFields', () => {
  it('disables RW before Desa, loads dependent RW, and clears RW on Desa change', async () => {
    const onChange = vi.fn()
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'd1', namaDesa: 'Dewasari' }, { id: 'd2', namaDesa: 'Pamalayan' }] })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'r1', nomorRw: 'RW 01' }] })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'r2', nomorRw: 'RW 02' }] }))

    render(<LocationFields value={{ desaId: '', rwId: '' }} onChange={onChange} errors={{}} />)
    expect(screen.getByLabelText(/rw/i)).toBeDisabled()

    await waitFor(() => expect(screen.getByRole('option', { name: 'Dewasari' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/desa/i), { target: { value: 'd1' } })
    await waitFor(() => expect(screen.getByRole('option', { name: 'RW 01' })).toBeInTheDocument())
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/master/desa/d1/rw', expect.anything())

    fireEvent.change(screen.getByLabelText(/desa/i), { target: { value: 'd2' } })
    expect(onChange).toHaveBeenLastCalledWith({ desaId: 'd2', rwId: '' })
  })
})
