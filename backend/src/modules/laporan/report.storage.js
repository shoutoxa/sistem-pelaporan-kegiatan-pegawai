import { randomUUID } from 'node:crypto'
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

export function createLocalStorage({ baseDir = UPLOAD_DIR } = {}) {
  ensureDir(baseDir)

  return {
    async upload({ path, file }) {
      const fullPath = join(baseDir, path)
      const dir = join(baseDir, path.split('/').slice(0, -1).join('/'))
      ensureDir(dir)
      writeFileSync(fullPath, file.buffer)
      return path
    },
    async remove(paths) {
      for (const path of paths) {
        try {
          const fullPath = join(baseDir, path)
          if (existsSync(fullPath)) {
            unlinkSync(fullPath)
          }
        } catch {
          // Ignore removal errors
        }
      }
    },
    async createSignedUrl(path, expiresInSeconds = 600) {
      const cleanPath = String(path || '').replace(/^\/+/, '')
      return '/api/files/' + cleanPath
    },
  }
}

export function createStorage({ client, bucket } = {}) {
  if (!client || !bucket) {
    return createLocalStorage()
  }
  const storageBucket = client.storage.from(bucket)
  return {
    async upload({ path, file }) {
      const { error } = await storageBucket.upload(path, file.buffer, { contentType: file.mimetype, upsert: false })
      if (error) {
        const err = new Error('Storage operation failed.')
        err.code = 'STORAGE_ERROR'
        throw err
      }
      return path
    },
    async remove(paths) {
      if (!paths.length) return
      const { error } = await storageBucket.remove(paths)
      if (error) {
        const err = new Error('Storage operation failed.')
        err.code = 'STORAGE_ERROR'
        throw err
      }
    },
    async createSignedUrl(path, expiresInSeconds = 600) {
      const { data, error } = await storageBucket.createSignedUrl(path, expiresInSeconds)
      if (error || !data?.signedUrl) {
        const err = new Error('Storage operation failed.')
        err.code = 'STORAGE_ERROR'
        throw err
      }
      return data.signedUrl
    },
  }
}

export const createSupabaseStorage = createStorage

