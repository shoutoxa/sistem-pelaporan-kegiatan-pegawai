export function createFtthRepository(prisma) {
  if (!process.env.DATABASE_URL) {
    const uploads = new Map()
    return {
      prepareUpload: async (data) => {
        const item = { ...data, id: data.id || `upl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, state: 'PREPARED', createdAt: new Date(), updatedAt: new Date() }
        uploads.set(data.storagePath, item)
        return item
      },
      markUpload: async (storagePath, state) => {
        const item = uploads.get(storagePath)
        if (item) { item.state = state; item.updatedAt = new Date() }
        return item
      },
      recordRemoteUpload: async (storagePath, remotePath) => {
        const item = uploads.get(storagePath)
        if (item) { item.remotePath = remotePath; item.state = 'REMOTE_UPLOADED'; item.updatedAt = new Date() }
        return item
      },
      pendingUploads: async () => Array.from(uploads.values()).filter((u) => u.state !== 'SYNCED'),
      identity: async () => null,
      localUser: async () => null,
      mappings: async () => [],
      saveMapping: async () => null,
    }
  }
  return {
    prepareUpload: (data) => prisma.ftthUpload.create({ data }),
    markUpload: (storagePath, state) => prisma.ftthUpload.update({ where: { storagePath }, data: { state } }),
    recordRemoteUpload: (storagePath, remotePath) => prisma.ftthUpload.update({ where: { storagePath }, data: { remotePath, state: 'REMOTE_UPLOADED' } }),
    pendingUploads: () => prisma.ftthUpload.findMany({ where: { state: { not: 'SYNCED' } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    identity: (userId) => prisma.ftthIdentity.findUnique({ where: { userId } }),
    localUser: (id) => prisma.user.findFirst({ where: { id, isActive: true }, select: { id: true } }),
    mappings: () => prisma.user.findMany({
      where: { isActive: true }, orderBy: { nama: 'asc' },
      select: { id: true, nama: true, role: true, ftthIdentity: true },
    }),
    saveMapping: (userId, data) => prisma.ftthIdentity.upsert({
      where: { userId }, create: { userId, ...data }, update: data,
    }),
  }
}
