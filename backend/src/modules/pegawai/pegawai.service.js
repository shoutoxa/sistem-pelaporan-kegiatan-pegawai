function pegawaiError(code, message, errors) {
  const error = new Error(message)
  error.code = code
  if (errors) error.errors = errors
  return error
}

const publicSelect = { id: true, nama: true, username: true, isActive: true, wajibLapor: true, createdAt: true, updatedAt: true }

function normalizePayload(payload, { partial = false } = {}) {
  const data = {}
  if (!partial || payload.nama !== undefined) {
    const nama = typeof payload.nama === 'string' ? payload.nama.trim() : ''
    if (nama.length < 2 || nama.length > 120) throw pegawaiError('VALIDATION', 'Nama Pegawai harus 2 sampai 120 karakter.', { nama: 'Nama Pegawai harus 2 sampai 120 karakter.' })
    data.nama = nama
  }
  if (!partial || payload.username !== undefined) {
    const username = typeof payload.username === 'string' ? payload.username.trim().toLowerCase() : ''
    if (!/^[a-z0-9._-]{3,50}$/.test(username)) throw pegawaiError('VALIDATION', 'Username tidak valid.', { username: 'Username harus 3 sampai 50 karakter.' })
    data.username = username
  }
  if (!partial || payload.password) {
    if (typeof payload.password !== 'string' || payload.password.length < 8 || payload.password.length > 100) throw pegawaiError('VALIDATION', 'Password harus 8 sampai 100 karakter.', { password: 'Password harus 8 sampai 100 karakter.' })
    data.password = payload.password
  }
  for (const key of ['wajibLapor', 'isActive']) {
    if (payload[key] !== undefined) {
      if (typeof payload[key] !== 'boolean') throw pegawaiError('VALIDATION', `${key} harus boolean.`, { [key]: `${key} harus boolean.` })
      data[key] = payload[key]
    }
  }
  return data
}

export function createPegawaiService({ prisma, passwordHasher }) {
  async function ensureUniqueUsername(username, excludedId) {
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing && existing.id !== excludedId) throw pegawaiError('DUPLICATE', 'Username sudah digunakan.', { username: 'Username sudah digunakan.' })
  }

  return {
    async create(payload) {
      const data = normalizePayload(payload)
      await ensureUniqueUsername(data.username)
      const passwordHash = await passwordHasher.hash(data.password, 12)
      return prisma.user.create({ data: { nama: data.nama, username: data.username, passwordHash, role: 'PEGAWAI', isActive: data.isActive ?? true, wajibLapor: data.wajibLapor ?? false }, select: publicSelect })
    },
    async update(id, payload) {
      const employee = await prisma.user.findFirst({ where: { id, role: 'PEGAWAI' } })
      if (!employee) throw pegawaiError('NOT_FOUND', 'Pegawai tidak ditemukan.')
      const data = normalizePayload(payload, { partial: true })
      if (data.username) await ensureUniqueUsername(data.username, id)
      if (data.password) {
        data.passwordHash = await passwordHasher.hash(data.password, 12)
        delete data.password
      }
      return prisma.user.update({ where: { id }, data, select: publicSelect })
    },
    async setActive(id, isActive) {
      if (typeof isActive !== 'boolean') throw pegawaiError('VALIDATION', 'Status aktif harus boolean.', { isActive: 'Status aktif harus boolean.' })
      const result = await prisma.user.updateMany({ where: { id, role: 'PEGAWAI' }, data: { isActive } })
      if (!result.count) throw pegawaiError('NOT_FOUND', 'Pegawai tidak ditemukan.')
      return prisma.user.findFirst({ where: { id, role: 'PEGAWAI' }, select: publicSelect })
    },
    async list() {
      return prisma.user.findMany({ where: { role: 'PEGAWAI' }, select: publicSelect, orderBy: { nama: 'asc' } })
    },
  }
}
