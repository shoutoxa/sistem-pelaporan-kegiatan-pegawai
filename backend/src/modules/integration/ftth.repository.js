export function createFtthRepository(prisma) {
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
