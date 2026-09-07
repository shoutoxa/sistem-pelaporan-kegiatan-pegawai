import { describe, expect, it, vi } from 'vitest'
import { createFtthClient } from '../src/modules/integration/ftth.client.js'

describe('FTTH API client', () => {
  it('uses multipart file without manually setting the boundary', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ file_url: '/uploads/test.png' }) })
    const client = createFtthClient({ apiKey: 'test-key', fetchImpl })
    await client.uploadAttachment({ buffer: Buffer.from('test'), mimetype: 'image/png', originalname: 'test.png' })
    const [url, options] = fetchImpl.mock.calls[0]
    expect(url.pathname).toBe('/ftth_api/integration/dokumentasi-laporan/upload')
    expect(options.headers['content-type']).toBeUndefined()
    expect(options.body.get('file').name).toBe('test.png')
    expect(await options.body.get('file').text()).toBe('test')
  })
  it('sends JSON once and handles empty delete responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ id: 'report' }) }).mockResolvedValueOnce({ ok: true, status: 204 })
    const client = createFtthClient({ baseUrl: 'https://example.test', apiKey: 'test-key', fetchImpl })
    await client.createReport({ status: 'PENDING' })
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ method: 'POST', redirect: 'error', body: '{"status":"PENDING"}' })
    await expect(client.deleteReport('report')).resolves.toBeNull()
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
  it('keeps the API key in the backend request header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'category-1' }],
    })
    const client = createFtthClient({
      baseUrl: 'https://example.test/integration/',
      apiKey: 'test-key',
      fetchImpl,
    })

    await expect(client.listCategories()).resolves.toEqual([{ id: 'category-1' }])
    expect(fetchImpl.mock.calls[0][0].toString()).toBe('https://example.test/integration/master-categories')
    expect(fetchImpl.mock.calls[0][1]).toEqual(expect.objectContaining({
      method: 'GET',
      headers: { accept: 'application/json', 'x-api-key': 'test-key' },
    }))
  })

  it('fails closed when the API key is not configured', async () => {
    const client = createFtthClient({ baseUrl: 'https://example.test', apiKey: '' })

    await expect(client.listProcesses()).rejects.toMatchObject({
      code: 'INTEGRATION_NOT_CONFIGURED',
    })
  })

  it('passes pagination parameters to read-only project data', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    const client = createFtthClient({ baseUrl: 'https://example.test/integration', apiKey: 'test-key', fetchImpl })

    await client.listProjects({ limit: 50, offset: 100, orderBy: 'name', orderDir: 'asc' })

    expect(fetchImpl.mock.calls[0][0].toString()).toBe('https://example.test/integration/projects?limit=50&offset=100&orderBy=name&orderDir=asc')
  })
  it('downloads a file through the documented endpoint with the API key', async () => {
    const response = { ok: true, arrayBuffer: async () => Uint8Array.from([1]) }
    const fetchImpl = vi.fn().mockResolvedValue(response)
    const client = createFtthClient({ baseUrl: 'https://example.test/integration', apiKey: 'test-key', fetchImpl })
    await expect(client.downloadAttachment('attachment-id')).resolves.toBe(response)
    expect(fetchImpl.mock.calls[0][0].toString()).toBe('https://example.test/integration/dokumentasi-laporan/attachment-id/download')
    expect(fetchImpl.mock.calls[0][1].headers).toEqual({ 'x-api-key': 'test-key' })
  })
  it('supports forced download mode for attachments and profile photos', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => Uint8Array.from([1]) })
    const client = createFtthClient({ baseUrl: 'https://example.test/integration', apiKey: 'test-key', fetchImpl })
    await client.downloadAttachment('attachment-id', { forceDownload: true })
    await client.getUserPhoto('user-id', { forceDownload: true })
    expect(fetchImpl.mock.calls[0][0].search).toBe('?mode=download')
    expect(fetchImpl.mock.calls[1][0].toString()).toBe('https://example.test/integration/users/user-id/foto?mode=download')
  })
})
