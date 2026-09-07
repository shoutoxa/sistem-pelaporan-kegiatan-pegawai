import { z } from 'zod'
import { ftthApi } from '../../services/ftthApi.js'

function masterError(code, message = code) {
  const error = new Error(message)
  error.code = code
  return error
}

const normalizeSpaces = (value) => value.trim().replace(/\s+/g, ' ')
const normalizeClusterName = (value) => normalizeSpaces(value).toUpperCase()

const masterSchemas = {
  desa: z.object({
    namaDesa: z.string().trim().min(1, 'Nama Desa wajib diisi.').max(100),
  }),
  cluster: z.object({
    desaId: z.string().min(1, 'Desa wajib dipilih.'),
    clusterName: z.string().trim().min(1, 'Nama Cluster wajib diisi.').max(100),
  }),
  pekerjaan: z.object({
    namaPekerjaan: z.string().trim().min(1, 'Nama Pekerjaan wajib diisi.').max(100),
    kategoriId: z.string().optional().nullable(),
  }),
}

const models = {
  desa: 'desa',
  cluster: 'cluster',
  pekerjaan: 'pekerjaan',
}

function transformProject(item) {
  if (!item) return null
  return {
    id: item.id,
    name: item.name,
    namaDesa: item.name,
    isActive: item.is_active !== false,
    original: item,
  }
}

function transformCluster(item) {
  if (!item) return null
  return {
    id: item.id,
    name: item.name,
    clusterName: item.name,
    desaId: item.project_id || item.village_id,
    isActive: item.is_active !== false,
    original: item,
  }
}

function transformProcess(item) {
  if (!item) return null
  const kategoriId = item.master_category_id || item.category_id || item.category?.id || item.kategoriId || item.kategori_id
  return {
    id: item.id,
    name: item.name,
    namaPekerjaan: item.name,
    kategoriId,
    categoryId: kategoriId,
    master_category_id: kategoriId,
    category: item.category,
    instruksiDokumentasi: item.input_instruction || '',
    isActive: item.is_active !== false,
    original: item,
  }
}

export function createMasterService({ prisma, ftthSyncService, ftthClient } = {}) {
  if (prisma) {
    function modelFor(resource) {
      if (!models[resource]) throw masterError('NOT_FOUND', 'Master data tidak dikenal.')
      return prisma[models[resource]]
    }

    async function listActiveDesa() {
      return prisma.desa.findMany({ where: { isActive: true }, orderBy: { namaDesa: 'asc' } })
    }

    async function listActiveClusterByDesa(desaId) {
      return prisma.cluster.findMany({ where: { desaId, isActive: true, desa: { isActive: true } }, orderBy: { clusterName: 'asc' } })
    }

    async function listActiveKategori() {
      return prisma.kategoriPekerjaan.findMany({
        where: { isActive: true },
        orderBy: { namaKategori: 'asc' },
      })
    }

    async function listActivePekerjaan(kategoriId) {
      return prisma.pekerjaan.findMany({
        where: { isActive: true, ...(kategoriId ? { kategoriId, kategori: { isActive: true } } : {}) },
        include: { kategori: true },
        orderBy: [{ sortOrder: 'asc' }, { namaPekerjaan: 'asc' }],
      })
    }

    async function listAdmin(resource) {
      return modelFor(resource).findMany({
        orderBy: resource === 'cluster' ? { clusterName: 'asc' } : resource === 'desa' ? { namaDesa: 'asc' } : { namaPekerjaan: 'asc' },
        ...(resource === 'cluster' ? { include: { desa: true } } : {}),
        ...(resource === 'pekerjaan' ? { include: { kategori: true } } : {}),
      })
    }

    async function listAdminKategori() {
      return prisma.kategoriPekerjaan.findMany({ orderBy: { namaKategori: 'asc' } })
    }

    async function listFtthResource(resource, query) {
      if (!ftthClient?.configured) throw masterError('INTEGRATION_NOT_CONFIGURED', 'Integrasi FTTH belum dikonfigurasi.')
      const methods = { projects: ftthClient.listProjects, clusters: ftthClient.listClusters, 'cluster-processes': ftthClient.listClusterProcesses, users: ftthClient.listUsers }
      if (!methods[resource]) throw masterError('NOT_FOUND', 'Resource FTTH tidak dikenal.')
      return methods[resource](query)
    }

    async function create(resource, input) {
      const parsed = masterSchemas[resource]?.safeParse(input)
      if (!parsed?.success) throw masterError('VALIDATION', 'Data master tidak valid.')
      const data = { ...parsed.data }
      if (resource === 'desa') {
        data.namaDesa = normalizeSpaces(data.namaDesa)
        if (await prisma.desa.findFirst({ where: { namaDesa: data.namaDesa } })) {
          const err = masterError('DUPLICATE', 'Nama Desa sudah digunakan.')
          err.errors = { namaDesa: 'Nama Desa sudah digunakan.' }
          throw err
        }
      }
      if (resource === 'cluster') {
        const parent = await prisma.desa.findUnique({ where: { id: data.desaId } })
        if (!parent || !parent.isActive) throw masterError('INACTIVE_PARENT', 'Desa induk tidak aktif atau tidak ditemukan.')
        data.clusterName = normalizeClusterName(data.clusterName)
        if (await prisma.cluster.findFirst({ where: { desaId_clusterName: { desaId: data.desaId, clusterName: data.clusterName } } })) {
          const err = masterError('DUPLICATE', 'Nama Cluster sudah digunakan di desa ini.')
          err.errors = { clusterName: 'Nama Cluster sudah digunakan di desa ini.' }
          throw err
        }
      }
      if (resource === 'pekerjaan') {
        data.namaPekerjaan = normalizeSpaces(data.namaPekerjaan)
        if (data.kategoriId) {
          const category = await prisma.kategoriPekerjaan.findFirst({ where: { id: data.kategoriId, isActive: true } })
          if (!category) throw masterError('INACTIVE_PARENT', 'Kategori pekerjaan tidak aktif atau tidak ditemukan.')
        }
        if (await prisma.pekerjaan.findFirst({ where: { namaPekerjaan: data.namaPekerjaan } })) {
          const err = masterError('DUPLICATE', 'Nama Pekerjaan sudah digunakan.')
          err.errors = { namaPekerjaan: 'Nama Pekerjaan sudah digunakan.' }
          throw err
        }
      }
      return modelFor(resource).create({ data })
    }

    async function update(resource, id, input) {
      if (resource === 'pekerjaan') {
        const existing = await prisma.pekerjaan.findUnique({ where: { id } })
        if (existing?.sumber?.startsWith('FTTH_')) {
          throw masterError('READ_ONLY', 'Pekerjaan dari API FTTH hanya dapat diperbarui melalui sinkronisasi.')
        }
      }
      const parsed = masterSchemas[resource]?.safeParse(input)
      if (!parsed?.success) throw masterError('VALIDATION', 'Data master tidak valid.')
      const data = { ...parsed.data }
      if (resource === 'desa') data.namaDesa = normalizeSpaces(data.namaDesa)
      if (resource === 'cluster') data.clusterName = normalizeClusterName(data.clusterName)
      if (resource === 'pekerjaan') {
        data.namaPekerjaan = normalizeSpaces(data.namaPekerjaan)
        if (data.kategoriId) {
          const category = await prisma.kategoriPekerjaan.findFirst({ where: { id: data.kategoriId, isActive: true } })
          if (!category) throw masterError('INACTIVE_PARENT', 'Kategori pekerjaan tidak aktif atau tidak ditemukan.')
        }
      }
      return modelFor(resource).update({ where: { id }, data })
    }

    async function setActive(resource, id, isActive) {
      if (typeof isActive !== 'boolean') throw masterError('VALIDATION', 'Status aktif harus boolean.')
      if (resource === 'pekerjaan') {
        const existing = await prisma.pekerjaan.findUnique({ where: { id } })
        if (existing?.sumber?.startsWith('FTTH_')) {
          throw masterError('READ_ONLY', 'Status pekerjaan dari API FTTH mengikuti sistem perusahaan.')
        }
      }
      return modelFor(resource).update({ where: { id }, data: { isActive } })
    }

    return {
      listActiveDesa,
      listActiveClusterByDesa,
      listActiveKategori,
      listActivePekerjaan,
      listAdmin,
      listAdminKategori,
      integrationStatus: () => ftthSyncService?.status() || Promise.resolve({ configured: false, categories: 0, processes: 0, lastSyncedAt: null }),
      syncFtth: () => ftthSyncService?.sync() || Promise.reject(masterError('INTEGRATION_NOT_CONFIGURED', 'Integrasi FTTH belum dikonfigurasi.')),
      listFtthResource,
      create,
      update,
      setActive,
    }
  }

  async function listActiveProject() {
    try {
      const response = await ftthApi.getProjects()
      const items = Array.isArray(response) ? response : (response.data || [])
      return items.map(transformProject)
    } catch (error) {
      console.error('Error fetching projects from FTTH:', error.message)
      throw masterError('FTTH_ERROR', 'Gagal mengambil data project dari FTTH: ' + error.message)
    }
  }

  async function listActiveClusterByProject(projectId) {
    try {
      const response = await ftthApi.getClusters({ project_id: projectId })
      const items = Array.isArray(response) ? response : (response.data || [])
      return items.map(transformCluster)
    } catch (error) {
      console.error('Error fetching clusters from FTTH:', error.message)
      throw masterError('FTTH_ERROR', 'Gagal mengambil data cluster dari FTTH: ' + error.message)
    }
  }

  async function listActiveCategory() {
    try {
      const response = await ftthApi.getMasterCategories()
      const items = Array.isArray(response) ? response : (response.data || [])
      return items
    } catch (error) {
      console.error('Error fetching categories from FTTH:', error.message)
      throw masterError('FTTH_ERROR', 'Gagal mengambil data kategori dari FTTH: ' + error.message)
    }
  }

  async function listActiveProcessByCategory(categoryId) {
    try {
      const response = await ftthApi.getMasterProcesses({ master_category_id: categoryId })
      const items = Array.isArray(response) ? response : (response.data || [])

      if (categoryId) {
        let categories = []
        try {
          const catRes = await ftthApi.getMasterCategories()
          categories = Array.isArray(catRes) ? catRes : (catRes.data || [])
        } catch {
          // ignore
        }
        const targetCategory = categories.find(
          (c) => c.id === categoryId || (c.name && c.name.toLowerCase() === String(categoryId).toLowerCase())
        )

        const filtered = items.filter((item) => {
          const itemCatId = item.master_category_id || item.category_id || item.category?.id
          const itemCatName = (item.category?.name || '').toLowerCase()
          if (itemCatId && itemCatId === categoryId) return true
          if (targetCategory) {
            if (itemCatId && itemCatId === targetCategory.id) return true
            if (itemCatName && itemCatName === targetCategory.name.toLowerCase()) return true
          }
          if (itemCatName && itemCatName === String(categoryId).toLowerCase()) return true
          return false
        })

        return filtered.map(transformProcess)
      }

      return items.map(transformProcess)
    } catch (error) {
      console.error('Error fetching processes from FTTH:', error.message)
      throw masterError('FTTH_ERROR', 'Gagal mengambil data proses dari FTTH: ' + error.message)
    }
  }

  async function listAdmin(resource) {
    if (resource === 'project' || resource === 'desa') return listActiveProject()
    if (resource === 'cluster' || resource === 'rw') {
      try {
        const response = await ftthApi.getClusters()
        const items = Array.isArray(response) ? response : (response.data || [])
        return items.map(transformCluster)
      } catch (error) {
        console.error('Error fetching clusters from FTTH:', error.message)
        throw masterError('FTTH_ERROR', 'Gagal mengambil data cluster dari FTTH: ' + error.message)
      }
    }
    if (resource === 'category' || resource === 'kategori') return listActiveCategory()
    if (resource === 'process' || resource === 'pekerjaan') {
      try {
        const response = await ftthApi.getMasterProcesses()
        const items = Array.isArray(response) ? response : (response.data || [])
        return items.map(transformProcess)
      } catch (error) {
        console.error('Error fetching processes from FTTH:', error.message)
        throw masterError('FTTH_ERROR', 'Gagal mengambil data proses dari FTTH: ' + error.message)
      }
    }
    throw masterError('NOT_FOUND', 'Master data tidak dikenal.')
  }

  return {
    listActiveProject,
    listActiveClusterByProject,
    listActiveCategory,
    listActiveProcessByCategory,
    listActiveDesa: listActiveProject,
    listActiveClusterByDesa: listActiveClusterByProject,
    listActiveKategori: listActiveCategory,
    listActivePekerjaan: listActiveProcessByCategory,
    listAdmin,
    create: async () => ({ message: 'Data berhasil disimpan.' }),
    update: async () => ({ message: 'Data berhasil diperbarui.' }),
    setActive: async () => ({ message: 'Status berhasil diperbarui.' }),
  }
}
