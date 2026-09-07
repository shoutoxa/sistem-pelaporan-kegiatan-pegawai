import { afterEach, describe, expect, it, vi } from 'vitest'
import { http } from './http.js'

describe('http client', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('preserves the canonical message and field errors from a failed API response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Data laporan tidak valid', errors: { clusterId: 'RW tidak tersedia' } }),
    }))

    await expect(http.request('/api/laporan')).rejects.toMatchObject({
      message: 'Data laporan tidak valid',
      status: 400,
      errors: { clusterId: 'RW tidak tersedia' },
    })
  })

  it('retries on network failure (status undefined) before succeeding', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const res = await http.request('/api/test', { retries: 2 })
    expect(res).toEqual({ success: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws network error after exhausting retries', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(http.request('/api/test', { retries: 1 })).rejects.toThrow('Failed to fetch')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
