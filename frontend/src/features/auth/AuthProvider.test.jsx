import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthProvider.jsx'

function Probe() {
  const { user, loading } = useAuth()
  return <p>{loading ? 'loading' : user ? user.role : 'anonymous'}</p>
}

describe('AuthProvider', () => {
  it('loads the current session from /api/auth/me', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ user: { id: 'u1', role: 'PEGAWAI' } }) }))

    render(<MemoryRouter><AuthProvider><Probe /></AuthProvider></MemoryRouter>)

    await waitFor(() => expect(screen.getByText('PEGAWAI')).toBeInTheDocument())
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/auth/me', expect.objectContaining({ credentials: 'include' }))
  })
})
