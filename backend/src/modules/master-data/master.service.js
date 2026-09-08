import { ftthApi as defaultFtthApi } from '../../services/ftthApi.js'

function masterError(code, message = code) {
  const error = new Error(message)
  error.code = code
  return error
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

function transformCategory(item) {
  if (!item) return null
  return {
    id: item.id,
    name: item.name,
    namaKategori: item.name,
    description: item.description,
    deskripsi: item.description || '-',
    sumber: 'FTTH Core',
    isActive: item.is_active !== false,
    original: item,
  }
}

export function createMasterService({ ftthApi: injectedFtthApi } = {}) {
  const ftth = injectedFtthApi || defaultFtthApi

  async function listActiveProject() {
    try {
      const response = await ftth.getProjects()
      const items = Array.isArray(response) ? response : (response.data || [])
      return items.map(transformProject)
    } catch (error) {
      console.error('Error fetching projects from FTTH:', error.message)
      throw masterError('FTTH_ERROR', 'Gagal mengambil data project dari FTTH: ' + error.message)
    }
  }

  async function listActiveClusterByProject(projectId) {
    try {
      const response = await ftth.getClusters({ project_id: projectId })
      const items = Array.isArray(response) ? response : (response.data || [])
      return items.map(transformCluster)
    } catch (error) {
      console.error('Error fetching clusters from FTTH:', error.message)
      throw masterError('FTTH_ERROR', 'Gagal mengambil data cluster dari FTTH: ' + error.message)
    }
  }

  async function listActiveCategory() {
    try {
      const response = await ftth.getMasterCategories()
      const items = Array.isArray(response) ? response : (response.data || [])
      return items.map(transformCategory)
    } catch (error) {
      console.error('Error fetching categories from FTTH:', error.message)
      throw masterError('FTTH_ERROR', 'Gagal mengambil data kategori dari FTTH: ' + error.message)
    }
  }

  async function listActiveProcessByCategory(categoryId) {
    try {
      const response = await ftth.getMasterProcesses({ master_category_id: categoryId })
      const items = Array.isArray(response) ? response : (response.data || [])

      if (categoryId) {
        let categories = []
        try {
          const catRes = await ftth.getMasterCategories()
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
        const response = await ftth.getClusters()
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
        const response = await ftth.getMasterProcesses()
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
