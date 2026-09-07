import { describe, expect, it } from 'vitest'
import { createFtthSyncService } from '../src/modules/integration/ftth-sync.service.js'

function fakePrisma() {
  const categories = []
  const processes = []
  const model = (rows, nameKey) => ({
    findUnique: async ({ where }) => rows.find((row) => Object.entries(where).every(([key, value]) => row[key] === value)) || null,
    create: async ({ data }) => {
      const row = { id: `${nameKey}-${rows.length + 1}`, ...data }
      rows.push(row)
      return row
    },
    update: async ({ where, data }) => {
      const row = rows.find((item) => item.id === where.id)
      Object.assign(row, data)
      return row
    },
  })
  return {
    categories,
    processes,
    kategoriPekerjaan: model(categories, 'category'),
    pekerjaan: model(processes, 'process'),
    $transaction: async (callback) => callback({
      kategoriPekerjaan: model(categories, 'category'),
      pekerjaan: model(processes, 'process'),
    }),
  }
}

describe('FTTH master synchronization', () => {
  it('imports categories before processes and remains idempotent by external id', async () => {
    const prisma = fakePrisma()
    const categoryId = '00f8319d-4ded-4e67-af5c-f36222b1feb0'
    const processId = 'd176e3c9-3068-4cc8-a97b-d24ab7fe1814'
    const client = {
      configured: true,
      listCategories: async () => [{ id: categoryId, name: 'Sitac', description: null, is_active: true }],
      listProcesses: async () => [{
        id: processId,
        name: 'Sosialisasi',
        description: 'Koordinasi warga',
        master_category_id: categoryId,
        sort_order: 1,
        allow_file: true,
        allow_text: true,
        allow_link: true,
        input_instruction: 'Lampirkan bukti sosialisasi',
        is_active: true,
        source: 'app',
      }],
    }
    const service = createFtthSyncService({
      prisma,
      client,
      clock: () => new Date('2026-09-03T03:00:00.000Z'),
    })

    const first = await service.sync()
    const second = await service.sync()

    expect(first.categories).toEqual({ total: 1, created: 1, updated: 0 })
    expect(first.processes).toEqual({ total: 1, created: 1, updated: 0 })
    expect(second.categories).toEqual({ total: 1, created: 0, updated: 1 })
    expect(second.processes).toEqual({ total: 1, created: 0, updated: 1 })
    expect(prisma.categories).toHaveLength(1)
    expect(prisma.processes).toHaveLength(1)
    expect(prisma.processes[0]).toMatchObject({
      externalId: processId,
      kategoriId: prisma.categories[0].id,
      sumber: 'FTTH_APP',
      allowFile: true,
      allowText: true,
      allowLink: true,
    })
  })

  it('rejects a process whose category is missing from the same response', async () => {
    const prisma = fakePrisma()
    const client = {
      configured: true,
      listCategories: async () => [],
      listProcesses: async () => [{
        id: 'd176e3c9-3068-4cc8-a97b-d24ab7fe1814',
        name: 'Sosialisasi',
        master_category_id: '00f8319d-4ded-4e67-af5c-f36222b1feb0',
        is_active: true,
        source: 'app',
      }],
    }

    await expect(createFtthSyncService({ prisma, client }).sync()).rejects.toMatchObject({
      code: 'INTEGRATION_INVALID_RESPONSE',
    })
  })

  it('links an existing local process by name instead of creating a duplicate', async () => {
    const prisma = fakePrisma()
    prisma.processes.push({ id: 'local-1', namaPekerjaan: 'Sosialisasi', sumber: 'LOCAL' })
    const categoryId = '00f8319d-4ded-4e67-af5c-f36222b1feb0'
    const processId = 'd176e3c9-3068-4cc8-a97b-d24ab7fe1814'
    const client = {
      configured: true,
      listCategories: async () => [{ id: categoryId, name: 'Sitac', is_active: true }],
      listProcesses: async () => [{
        id: processId,
        name: 'Sosialisasi',
        master_category_id: categoryId,
        is_active: true,
        source: 'app',
      }],
    }

    const result = await createFtthSyncService({ prisma, client }).sync()

    expect(result.processes).toEqual({ total: 1, created: 0, updated: 1 })
    expect(prisma.processes).toHaveLength(1)
    expect(prisma.processes[0]).toMatchObject({ id: 'local-1', externalId: processId, sumber: 'FTTH_APP' })
  })
})
