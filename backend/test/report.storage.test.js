import { describe, expect, it, vi } from 'vitest'
import { createStorage } from '../src/modules/laporan/report.storage.js'

function fakeClient(result = {}) {
  const bucket = {
    upload: vi.fn().mockResolvedValue(result.upload || { data: { path: 'p' }, error: null }),
    remove: vi.fn().mockResolvedValue(result.remove || { data: null, error: null }),
    createSignedUrl: vi.fn().mockResolvedValue(result.signed || { data: { signedUrl: 'https://signed.test/p' }, error: null }),
  }
  return { client: { storage: { from: vi.fn(() => bucket) } }, bucket }
}

describe('private storage adapter', () => {
  it('uploads without overwrite and creates a short-lived signed URL', async () => {
    const { client, bucket } = fakeClient()
    const storage = createStorage({ client, bucket: 'dokumentasi-laporan' })

    await storage.upload({ path: 'reports/r1/1.jpg', file: { buffer: Buffer.from('x'), mimetype: 'image/jpeg' } })
    await expect(storage.createSignedUrl('reports/r1/1.jpg')).resolves.toBe('https://signed.test/p')
    expect(bucket.upload).toHaveBeenCalledWith('reports/r1/1.jpg', Buffer.from('x'), { contentType: 'image/jpeg', upsert: false })
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('reports/r1/1.jpg', 600)
  })

  it('turns provider errors into a domain error', async () => {
    const { client } = fakeClient({ upload: { data: null, error: { message: 'secret provider detail' } } })
    const storage = createStorage({ client, bucket: 'private' })

    await expect(storage.upload({ path: 'x', file: { buffer: Buffer.from('x'), mimetype: 'image/jpeg' } })).rejects.toMatchObject({ code: 'STORAGE_ERROR' })
  })
})
