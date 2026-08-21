export function createPegawaiService({ prisma }) {
  return {
    async setActive(id, isActive) {
      return prisma.user.update({ where: { id }, data: { isActive } })
    },
    async list() {
      return prisma.user.findMany({ where: { role: 'PEGAWAI' }, select: { id: true, nama: true, username: true, isActive: true, wajibLapor: true }, orderBy: { nama: 'asc' } })
    },
  }
}
