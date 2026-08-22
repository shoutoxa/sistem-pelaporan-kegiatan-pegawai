import { afterEach, describe, expect, it, vi } from 'vitest'
import { http } from './http.js'

describe('http client', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('preserves the canonical message and field errors from a failed API response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Data laporan tidak valid', errors: { rwId: 'RW tidak tersedia' } }),
    }))

    await expect(http.request('/api/laporan')).rejects.toMatchObject({
      message: 'Data laporan tidak valid',
      status: 400,
      errors: { rwId: 'RW tidak tersedia' },
    })
  })
})
