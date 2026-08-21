import { describe, expect, it } from 'vitest'
import { DEMO_STAGES, DEMO_USERS, DEMO_VILLAGES } from '../prisma/seed-data.js'

describe('demo seed contract', () => {
  it('contains the approved villages, stages, and users', () => {
    expect(DEMO_VILLAGES.map((village) => village.name)).toEqual(['Dewasari', 'Handapherang', 'Kertasari', 'Pamalayan'])
    expect(DEMO_STAGES).toHaveLength(11)
    expect(DEMO_USERS).toHaveLength(5)
    expect(DEMO_USERS.filter((user) => user.role === 'SUPERADMIN')).toHaveLength(1)
    expect(DEMO_USERS.filter((user) => user.role === 'PEGAWAI')).toHaveLength(4)
    expect(DEMO_USERS.filter((user) => user.role !== 'PEGAWAI' && user.role !== 'SUPERADMIN')).toHaveLength(0)
  })
})
