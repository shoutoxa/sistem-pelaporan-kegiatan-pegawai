import { rows, row, parse, idSchema, fail } from './ftth-report.schemas.js'
import { fileTypeFromBuffer } from 'file-type'

export function createFtthUsersService(client) {
  // Company roles describe directory entries; local middleware still controls access.
  const readOnly = async () => { throw fail('FORBIDDEN', 'Kelola akun, status, dan kewajiban pelaporan melalui sistem FTTH.') }
  return {
    create: readOnly, update: readOnly, setActive: readOnly,
    async clusters(userId, query = {}) {
      parse(idSchema, userId)
      return rows(await client.listUserClusters(userId, query))
    },
    async reportStatus(userId, query = {}) {
      parse(idSchema, userId)
      const result = await client.getUserReportStatus(userId, query)
      const data = result?.data ?? result
      if (!data || data.user_id !== userId || !Array.isArray(data.clusters) || typeof data.wajib_lapor !== 'boolean') throw fail('INTEGRATION_INVALID_RESPONSE', 'Status laporan FTTH tidak sesuai kontrak.')
      return data
    },
    async list() {
      const result = [], seen = new Set()
      for (let offset = 0; offset < 10000; offset += 1000) {
        const batch = rows(await client.listUsers({ limit: 1000, offset }))
        for (const user of batch) {
          if (seen.has(user.id)) throw fail('INTEGRATION_INVALID_RESPONSE', 'Pagination users FTTH mengembalikan ID berulang.')
          seen.add(user.id)
          result.push({ id: user.id, nama: user.full_name || user.username || user.id,
            username: user.username || '', role: user.role || '', nomorHp: user.phone || null,
            isActive: user.is_active !== false, wajibLapor: typeof user.wajib_lapor === 'boolean' ? user.wajib_lapor : null })
        }
        if (batch.length < 1000) return result
      }
      throw fail('INTEGRATION_INVALID_RESPONSE', 'Jumlah users FTTH melebihi batas pemuatan.')
    },
    async updatePhoto({ actor, targetUserId, file }) {
      if (actor?.role !== 'SUPERADMIN') throw fail('FORBIDDEN', 'Hanya admin dapat mengubah foto.')
      parse(idSchema, targetUserId)
      const user = row(await client.getUser(targetUserId))
      if (user.id !== targetUserId) throw fail('NOT_FOUND', 'User FTTH tidak ditemukan.')
      if (!file?.buffer?.length || file.buffer.length > 5000000) throw fail('VALIDATION', 'Foto maksimal 5 MB.')
      const detected = await fileTypeFromBuffer(file.buffer)
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(detected?.mime)) throw fail('VALIDATION', 'Foto harus JPG, PNG, atau WEBP.')
      try {
        await client.uploadUserPhoto(targetUserId, { ...file, mimetype: detected.mime,
          originalname: String(file.originalname || 'foto').replace(/[\\/\x00-\x1f]/g, '_').slice(0, 200) })
      } catch { throw fail('INTEGRATION_UNAVAILABLE', 'Upload foto belum terkonfirmasi. Periksa di FTTH sebelum mencoba kembali.') }
      return { id: targetUserId }
    },
  }
}
