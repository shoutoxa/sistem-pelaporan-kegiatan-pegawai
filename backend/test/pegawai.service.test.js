import { describe, expect, it, vi } from 'vitest'
import { createPegawaiService } from '../src/modules/pegawai/pegawai.service.js'

describe('pegawai service', () => {
  it('toggles active status only for employee accounts without deleting the user', async () => {
    const prisma = { user: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findFirst: vi.fn().mockResolvedValue({ id: 'u1', isActive: false }) } }
    const service = createPegawaiService({ prisma })

    await expect(service.setActive('u1', false)).resolves.toEqual({ id: 'u1', isActive: false })
    expect(prisma.user.updateMany).toHaveBeenCalledWith({ where: { id: 'u1', role: 'PEGAWAI' }, data: { isActive: false } })
  })

  it('creates an employee with a hashed password and fixed PEGAWAI role', async () => {
    const prisma = { user: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 'u1', nama: 'Ayu', username: 'ayu', role: 'PEGAWAI' }) } }
    const passwordHasher = { hash: vi.fn().mockResolvedValue('hashed-password') }
    const service = createPegawaiService({ prisma, passwordHasher })

    await service.create({ nama: ' Ayu ', username: ' AYU ', password: 'password-ku', wajibLapor: true })

    expect(passwordHasher.hash).toHaveBeenCalledWith('password-ku', 12)
    expect(prisma.user.create).toHaveBeenCalledWith({ data: { nama: 'Ayu', username: 'ayu', passwordHash: 'hashed-password', role: 'PEGAWAI', isActive: true, wajibLapor: true }, select: expect.any(Object) })
  })

  it('updates employee profile and optionally replaces the password', async () => {
    const prisma = { user: { findFirst: vi.fn().mockResolvedValue({ id: 'u1', role: 'PEGAWAI' }), findUnique: vi.fn().mockResolvedValue(null), update: vi.fn().mockResolvedValue({ id: 'u1', nama: 'Ayu Baru' }) } }
    const passwordHasher = { hash: vi.fn().mockResolvedValue('new-hash') }
    const service = createPegawaiService({ prisma, passwordHasher })

    await service.update('u1', { nama: 'Ayu Baru', username: 'ayu-baru', password: 'password-baru', wajibLapor: false, isActive: true })

    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u1' }, data: expect.objectContaining({ passwordHash: 'new-hash', wajibLapor: false }) }))
  })
})
