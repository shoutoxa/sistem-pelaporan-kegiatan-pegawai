import { z } from 'zod'

const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(150),
  description: z.string().nullable().optional(),
  is_active: z.boolean(),
})

const processSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(150),
  description: z.string().nullable().optional(),
  master_category_id: z.string().uuid(),
  sort_order: z.number().int().nullable().optional(),
  allow_file: z.boolean().default(true),
  allow_text: z.boolean().default(true),
  allow_link: z.boolean().default(false),
  input_instruction: z.string().nullable().optional(),
  is_active: z.boolean(),
  source: z.enum(['app', 'external']),
})

function integrationError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}
function parseRows(schema, value, label) {
  const parsed = z.array(schema).safeParse(value)
  if (!parsed.success) {
    throw integrationError(
      'INTEGRATION_INVALID_RESPONSE',
      `Struktur ${label} dari API FTTH tidak sesuai kontrak.`,
    )
  }
  return parsed.data
}

async function findCategory(tx, row) {
  return (
    (await tx.kategoriPekerjaan.findUnique({ where: { externalId: row.id } })) ||
    (await tx.kategoriPekerjaan.findUnique({ where: { namaKategori: row.name } }))
  )
}

async function findProcess(tx, row) {
  return (
    (await tx.pekerjaan.findUnique({ where: { externalId: row.id } })) ||
    (await tx.pekerjaan.findUnique({ where: { namaPekerjaan: row.name } }))
  )
}

export function createFtthSyncService({ prisma, client, clock = () => new Date() }) {
  async function status() {
    if (!client?.configured) {
      return { configured: false, categories: 0, processes: 0, lastSyncedAt: null }
    }

    const [categories, processes, latestCategory, latestProcess] = await Promise.all([
      prisma.kategoriPekerjaan.count({ where: { sumber: 'FTTH' } }),
      prisma.pekerjaan.count({ where: { sumber: { startsWith: 'FTTH_' } } }),
      prisma.kategoriPekerjaan.findFirst({
        where: { sumber: 'FTTH', lastSyncedAt: { not: null } },
        orderBy: { lastSyncedAt: 'desc' },
        select: { lastSyncedAt: true },
      }),
      prisma.pekerjaan.findFirst({
        where: { sumber: { startsWith: 'FTTH_' }, lastSyncedAt: { not: null } },
        orderBy: { lastSyncedAt: 'desc' },
        select: { lastSyncedAt: true },
      }),
    ])
    const timestamps = [latestCategory?.lastSyncedAt, latestProcess?.lastSyncedAt]
      .filter(Boolean)
      .map((value) => new Date(value))

    return {
      configured: true,
      categories,
      processes,
      lastSyncedAt: timestamps.length
        ? new Date(Math.max(...timestamps.map((value) => value.getTime()))).toISOString()
        : null,
    }
  }

  async function sync() {
    if (!client?.configured) {
      throw integrationError(
        'INTEGRATION_NOT_CONFIGURED',
        'Isi FTTH_API_KEY pada konfigurasi backend sebelum sinkronisasi.',
      )
    }

    const [rawCategories, rawProcesses] = await Promise.all([
      client.listCategories(),
      client.listProcesses(),
    ])
    const categories = parseRows(categorySchema, rawCategories, 'kategori')
    const processes = parseRows(processSchema, rawProcesses, 'pekerjaan')
    const categoryIds = new Set(categories.map((row) => row.id))
    if (processes.some((row) => !categoryIds.has(row.master_category_id))) {
      throw integrationError(
        'INTEGRATION_INVALID_RESPONSE',
        'Terdapat pekerjaan FTTH yang tidak memiliki kategori valid.',
      )
    }

    const syncedAt = clock()
    return prisma.$transaction(async (tx) => {
      const categoryMap = new Map()
      let categoriesCreated = 0
      let categoriesUpdated = 0
      let processesCreated = 0
      let processesUpdated = 0

      for (const row of categories) {
        const existing = await findCategory(tx, row)
        const data = {
          externalId: row.id,
          namaKategori: row.name,
          deskripsi: row.description || null,
          sumber: 'FTTH',
          isActive: row.is_active,
          lastSyncedAt: syncedAt,
        }
        const saved = existing
          ? await tx.kategoriPekerjaan.update({ where: { id: existing.id }, data })
          : await tx.kategoriPekerjaan.create({ data })
        existing ? categoriesUpdated++ : categoriesCreated++
        categoryMap.set(row.id, saved.id)
      }

      for (const row of processes) {
        const existing = await findProcess(tx, row)
        const data = {
          externalId: row.id,
          kategoriId: categoryMap.get(row.master_category_id),
          namaPekerjaan: row.name,
          instruksiDokumentasi: row.input_instruction || row.description || null,
          sumber: row.source === 'app' ? 'FTTH_APP' : 'FTTH_EXTERNAL',
          sortOrder: row.sort_order ?? null,
          allowFile: row.allow_file,
          allowText: row.allow_text,
          allowLink: row.allow_link,
          isActive: row.is_active,
          lastSyncedAt: syncedAt,
        }
        if (existing) {
          await tx.pekerjaan.update({ where: { id: existing.id }, data })
          processesUpdated++
        } else {
          await tx.pekerjaan.create({ data })
          processesCreated++
        }
      }

      return {
        syncedAt: syncedAt.toISOString(),
        categories: { total: categories.length, created: categoriesCreated, updated: categoriesUpdated },
        processes: { total: processes.length, created: processesCreated, updated: processesUpdated },
      }
    })
  }

  return { status, sync }
}
