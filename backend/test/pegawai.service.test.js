import { describe, expect, it, vi } from 'vitest'
import { createPegawaiService } from '../src/modules/pegawai/pegawai.service.js'

describe('pegawai service', () => {
  it('toggles active status without deleting the user', async () => {
    const prisma = { user: { update: vi.fn().mockResolvedValue({ id: 'u1', isActive: false }) } }
    const service = createPegawaiService({ prisma })

    await expect(service.setActive('u1', false)).resolves.toEqual({ id: 'u1', isActive: false })
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { isActive: false } })
  })
})
