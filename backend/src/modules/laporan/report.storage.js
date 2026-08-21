function providerError() {
  const error = new Error('Storage operation failed.')
  error.code = 'STORAGE_ERROR'
  return error
}

export function createStorage({ client, bucket }) {
  const storageBucket = client.storage.from(bucket)
  return {
    async upload({ path, file }) {
      const { error } = await storageBucket.upload(path, file.buffer, { contentType: file.mimetype, upsert: false })
      if (error) throw providerError()
      return path
    },
    async remove(paths) {
      if (!paths.length) return
      const { error } = await storageBucket.remove(paths)
      if (error) throw providerError()
    },
    async createSignedUrl(path, expiresInSeconds = 600) {
      const { data, error } = await storageBucket.createSignedUrl(path, expiresInSeconds)
      if (error || !data?.signedUrl) throw providerError()
      return data.signedUrl
    },
  }
}
