import { describe, expect, it, vi } from 'vitest'
import { createFtthUsersService } from '../src/modules/integration/ftth-users.service.js'

const id = 'e251e505-c7e0-411d-aff7-1107c69ed2b2'
describe('FTTH users adapter', () => {
  it('preserves company identity and role without exposing credentials or inventing wajib lapor', async () => {
    const service = createFtthUsersService({ listUsers: vi.fn().mockResolvedValue([{ id, username: 'admin', full_name: 'Administrator', role: 'administrator', is_active: false, password: 'secret' }]) })
    expect(await service.list()).toEqual([{ id, nama: 'Administrator', username: 'admin', role: 'administrator', nomorHp: null, isActive: false, wajibLapor: null }])
  })
  it('rejects account mutations without calling the company API', async () => {
    const service = createFtthUsersService({})
    for (const action of ['create', 'update', 'setActive']) await expect(service[action]()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
  it('fails closed on malformed responses', async () => {
    await expect(createFtthUsersService({ listUsers: async () => ({ error: 'bad' }) }).list()).rejects.toMatchObject({ code: 'INTEGRATION_INVALID_RESPONSE' })
  })
  it('rejects non-admin photo uploads and non-images', async () => {
    const uploadUserPhoto = vi.fn()
    const service = createFtthUsersService({ getUser: async () => ({ id }), uploadUserPhoto })
    await expect(service.updatePhoto({ actor: { role: 'PEGAWAI' }, targetUserId: id })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(service.updatePhoto({ actor: { role: 'SUPERADMIN' }, targetUserId: id, file: { buffer: Buffer.from('not an image') } })).rejects.toMatchObject({ code: 'VALIDATION' })
    expect(uploadUserPhoto).not.toHaveBeenCalled()
  })
})
