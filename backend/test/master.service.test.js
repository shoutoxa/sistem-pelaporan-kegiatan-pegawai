import { describe, expect, it } from 'vitest'
import { createMasterService } from '../src/modules/master-data/master.service.js'

function createFakePrisma() {
  return {
    desa: {
      findMany: async () => [{ id: 'd1', namaDesa: 'Dewasari', isActive: true }],
      findFirst: async () => null,
      create: async ({ data }) => ({ id: 'd2', ...data }),
      update: async ({ data }) => ({ id: 'd1', ...data }),
    },
    rw: {
      findMany: async () => [{ id: 'r1', desaId: 'd1', nomorRw: 'RW 01', isActive: true }],
      findFirst: async () => null,
      create: async ({ data }) => ({ id: 'r2', ...data }),
      update: async ({ data }) => ({ id: 'r1', ...data }),
    },
    tahapan: {
      findMany: async () => [{ id: 't1', namaTahapan: 'Penggalian Lubang', isActive: true }],
      findFirst: async () => null,
      create: async ({ data }) => ({ id: 't2', ...data }),
      update: async ({ data }) => ({ id: 't1', ...data }),
    },
  }
}

describe('master data service', () => {
  it('returns active Desa, RW by Desa, and Tahapan only', async () => {
    const prisma = createFakePrisma()
    const service = createMasterService({ prisma })

    await expect(service.listActiveDesa()).resolves.toEqual([{ id: 'd1', namaDesa: 'Dewasari', isActive: true }])
    await expect(service.listActiveRwByDesa('d1')).resolves.toEqual([{ id: 'r1', desaId: 'd1', nomorRw: 'RW 01', isActive: true }])
    await expect(service.listActiveTahapan()).resolves.toEqual([{ id: 't1', namaTahapan: 'Penggalian Lubang', isActive: true }])
  })

  it('normalizes names and rejects duplicate or inactive parent data', async () => {
    const prisma = createFakePrisma()
    prisma.desa.findFirst = async ({ where }) => where.namaDesa === 'Dewasari' ? { id: 'd1', isActive: true } : null
    prisma.rw.findFirst = async ({ where }) => where.desaId_nomorRw ? { id: 'r1' } : null
    prisma.desa.findUnique = async () => ({ id: 'd2', isActive: false })
    const service = createMasterService({ prisma })

    await expect(service.create('desa', { namaDesa: '  Dewasari  ' })).rejects.toMatchObject({ code: 'DUPLICATE' })
    await expect(service.create('rw', { desaId: 'd2', nomorRw: 'rw 02' })).rejects.toMatchObject({ code: 'INACTIVE_PARENT' })
  })

  it('soft-disables a master record with update, never delete', async () => {
    const prisma = createFakePrisma()
    const service = createMasterService({ prisma })

    await expect(service.setActive('tahapan', 't1', false)).resolves.toMatchObject({ isActive: false })
  })
})
