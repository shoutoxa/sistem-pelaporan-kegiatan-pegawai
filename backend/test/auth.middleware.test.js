import { describe, expect, it, vi } from 'vitest'
import { requireAuth, requireRole } from '../src/modules/auth/auth.middleware.js'

function responseDouble() {
  const response = { status: vi.fn(), json: vi.fn() }
  response.status.mockReturnValue(response)
  return response
}

describe('auth middleware', () => {
  it('uses the canonical public response for expired sessions', async () => {
    const response = responseDouble()
    await requireAuth({ authService: { readSession: vi.fn().mockRejectedValue(new Error('expired')) } })({ cookies: {} }, response, vi.fn())
    expect(response.status).toHaveBeenCalledWith(401)
    expect(response.json).toHaveBeenCalledWith({ message: 'Sesi tidak valid atau sudah berakhir.' })
  })

  it('uses the canonical public response for a forbidden role', () => {
    const response = responseDouble()
    requireRole('SUPERADMIN')({ user: { role: 'PEGAWAI' } }, response, vi.fn())
    expect(response.status).toHaveBeenCalledWith(403)
    expect(response.json).toHaveBeenCalledWith({ message: 'Anda tidak memiliki akses.' })
  })
})
