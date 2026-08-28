import { describe, expect, it } from 'vitest'
import { createMasterService } from '../src/modules/master-data/master.service.js'

function createFakePrisma() {
  return {
    desa: {
      findMany: async () => [{ id: 'd1', namaDesa: 'Dewasari', isActive: true }],
      findFirst: async () => null,
      findUnique: async () => ({ id: 'd1', isActive: true }),
      create: async ({ data }) => ({ id: 'd2', ...data }),
      update: async ({ data }) => ({ id: 'd1', ...data }),
    },
    cluster: {
      findMany: async () => [{ id: 'c1', desaId: 'd1', clusterName: 'Cluster 01', isActive: true }],
      findFirst: async () => null,
      create: async ({ data }) => ({ id: 'c2', ...data }),
      update: async ({ data }) => ({ id: 'c1', ...data }),
    },
    pekerjaan: {
      findMany: async () => [{ id: 'p1', namaPekerjaan: 'Penggalian Lubang', isActive: true }],
      findFirst: async () => null,
      create: async ({ data }) => ({ id: 'p2', ...data }),
      update: async ({ data }) => ({ id: 'p1', ...data }),
    },
  }
}

describe('master data service', () => {
  it('returns active Desa, Cluster by Desa, and Pekerjaan only', async () => {
    const prisma = createFakePrisma()
    const service = createMasterService({ prisma })

    await expect(service.listActiveDesa()).resolves.toEqual([{ id: 'd1', namaDesa: 'Dewasari', isActive: true }])
    await expect(service.listActiveClusterByDesa('d1')).resolves.toEqual([{ id: 'c1', desaId: 'd1', clusterName: 'Cluster 01', isActive: true }])
    await expect(service.listActivePekerjaan()).resolves.toEqual([{ id: 'p1', namaPekerjaan: 'Penggalian Lubang', isActive: true }])
  })

  it('requires an active parent Desa when listing Cluster for a new report', async () => {
    const prisma = createFakePrisma()
    let receivedWhere
    prisma.cluster.findMany = async ({ where }) => { receivedWhere = where; return [] }
    const service = createMasterService({ prisma })

    await service.listActiveClusterByDesa('d1')

    expect(receivedWhere).toEqual({ desaId: 'd1', isActive: true, desa: { isActive: true } })
  })

  it('normalizes names and rejects duplicate or inactive parent data', async () => {
    const prisma = createFakePrisma()
    prisma.desa.findFirst = async ({ where }) => where.namaDesa === 'Dewasari' ? { id: 'd1', isActive: true } : null
    prisma.cluster.findFirst = async ({ where }) => where.desaId_clusterName ? { id: 'c1' } : null
    prisma.desa.findUnique = async () => ({ id: 'd2', isActive: false })
    const service = createMasterService({ prisma })

    await expect(service.create('desa', { namaDesa: '  Dewasari  ' })).rejects.toMatchObject({ code: 'DUPLICATE' })
    await expect(service.create('cluster', { desaId: 'd2', clusterName: 'Cluster 02' })).rejects.toMatchObject({ code: 'INACTIVE_PARENT' })
  })

  it('soft-disables a master record with update, never delete', async () => {
    const prisma = createFakePrisma()
    const service = createMasterService({ prisma })

    await expect(service.setActive('pekerjaan', 'p1', false)).resolves.toMatchObject({ isActive: false })
  })
})
