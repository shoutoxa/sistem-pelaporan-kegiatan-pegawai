import { randomUUID } from 'node:crypto'

function pegawaiError(code, message, errors) {
  const error = new Error(message)
  error.code = code
  if (errors) error.errors = errors
  return error
}

const publicSelect = { id: true, nama: true, username: true, isActive: true, wajibLapor: true, nomorHp: true, fotoProfil: true, createdAt: true, updatedAt: true }

function extensionFor(mimetype, originalname = '') {
  if (mimetype === 'image/png') return 'png'
  if (mimetype === 'image/webp') return 'webp'
  const extension = originalname.split('.').pop()?.toLowerCase()
  return extension === 'jpeg' ? 'jpg' : 'jpg'
}

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
  if (payload.nomorHp !== undefined) {
    const hp = typeof payload.nomorHp === 'string' ? payload.nomorHp.trim() : ''
    data.nomorHp = hp || null
  }
  for (const key of ['wajibLapor', 'isActive']) {
    if (payload[key] !== undefined) {
      if (typeof payload[key] !== 'boolean') throw pegawaiError('VALIDATION', `${key} harus boolean.`, { [key]: `${key} harus boolean.` })
      data[key] = payload[key]
    }
  }
  return data
}

export function createPegawaiService({ prisma, passwordHasher, storage }) {
  async function ensureUniqueUsername(username, excludedId) {
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing && existing.id !== excludedId) throw pegawaiError('DUPLICATE', 'Username sudah digunakan.', { username: 'Username sudah digunakan.' })
  }

  async function resolveFotoUrl(path) {
    if (!path) return null
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    if (storage?.createSignedUrl) {
      try {
        return await storage.createSignedUrl(path, 86400)
      } catch {
        return path
      }
    }
    return path
  }

  async function withFotoUrl(user) {
    if (!user) return user
    const fotoProfilUrl = await resolveFotoUrl(user.fotoProfil)
    return { ...user, fotoProfilUrl }
  }

  return {
    async create(payload) {
      const data = normalizePayload(payload)
      await ensureUniqueUsername(data.username)
      const passwordHash = await passwordHasher.hash(data.password, 12)
      const created = await prisma.user.create({ data: { nama: data.nama, username: data.username, passwordHash, role: 'PEGAWAI', isActive: data.isActive ?? true, wajibLapor: data.wajibLapor ?? false, nomorHp: data.nomorHp ?? null }, select: publicSelect })
      return withFotoUrl(created)
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
      const updated = await prisma.user.update({ where: { id }, data, select: publicSelect })
      return withFotoUrl(updated)
    },
    async setActive(id, isActive) {
      if (typeof isActive !== 'boolean') throw pegawaiError('VALIDATION', 'Status aktif harus boolean.', { isActive: 'Status aktif harus boolean.' })
      const result = await prisma.user.updateMany({ where: { id, role: 'PEGAWAI' }, data: { isActive } })
      if (!result.count) throw pegawaiError('NOT_FOUND', 'Pegawai tidak ditemukan.')
      const updated = await prisma.user.findFirst({ where: { id, role: 'PEGAWAI' }, select: publicSelect })
      return withFotoUrl(updated)
    },
    async list() {
      const employees = await prisma.user.findMany({ where: { role: 'PEGAWAI' }, select: publicSelect, orderBy: { nama: 'asc' } })
      return Promise.all(employees.map(withFotoUrl))
    },
    async updatePhoto({ actor, targetUserId, file }) {
      if (actor?.role !== 'SUPERADMIN') throw pegawaiError('FORBIDDEN', 'Hanya Super Admin yang dapat mengubah foto profil pegawai.')
      const employee = await prisma.user.findFirst({ where: { id: targetUserId } })
      if (!employee) throw pegawaiError('NOT_FOUND', 'Pegawai tidak ditemukan.')
      if (!file) throw pegawaiError('VALIDATION', 'Foto profil wajib diunggah.')
      const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp'])
      if (!allowedMime.has(file.mimetype)) throw pegawaiError('VALIDATION', 'Format foto harus JPG, PNG, atau WEBP.')
      if (file.size > 5_000_000) throw pegawaiError('VALIDATION', 'Ukuran foto profil maksimal 5 MB.')

      if (employee.fotoProfil && storage?.remove) {
        try { await storage.remove([employee.fotoProfil]) } catch { /* cleanup best effort */ }
      }

      const ext = extensionFor(file.mimetype, file.originalname)
      const path = `profiles/${employee.id}/${randomUUID()}.${ext}`

      if (storage?.upload) {
        await storage.upload({ path, file })
      }

      const updated = await prisma.user.update({
        where: { id: targetUserId },
        data: { fotoProfil: path },
        select: publicSelect,
      })

      return withFotoUrl(updated)
    },
  }
}
