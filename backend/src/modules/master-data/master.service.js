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

function transformProcess(item, categoryMap = {}) {
  if (!item) return null
  const kategoriId =
    item.master_category_id ||
    item.category_id ||
    item.category?.id ||
    item.MasterCategory?.id ||
    item.kategoriId ||
    item.kategori_id
  const catObj =
    item.category ||
    item.kategori ||
    item.MasterCategory ||
    item.master_category ||
    (kategoriId ? categoryMap[kategoriId] : null)
  const catName =
    catObj?.name ||
    catObj?.namaKategori ||
    catObj?.nama ||
    item.category_name ||
    item.master_category_name ||
    (kategoriId && categoryMap[kategoriId] ? (categoryMap[kategoriId].name || categoryMap[kategoriId].namaKategori) : null)
  return {
    id: item.id,
    name: item.name,
    namaPekerjaan: item.name,
    kategoriId,
    categoryId: kategoriId,
    master_category_id: kategoriId,
    category: catObj || (catName ? { id: kategoriId, name: catName } : null),
    kategori: catName ? { id: kategoriId, namaKategori: catName } : null,
    namaKategori: catName || null,
    instruksiDokumentasi: item.input_instruction || item.instruksiDokumentasi || '',
    isActive: item.is_active !== false,
    source: item.source || 'app',
    sumber: item.source || 'app',
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
      const [response, catRes] = await Promise.all([
        ftth.getMasterProcesses({ master_category_id: categoryId }),
        ftth.getMasterCategories().catch(() => []),
      ])
      const items = Array.isArray(response) ? response : (response.data || [])
      const categories = Array.isArray(catRes) ? catRes : (catRes.data || [])
      const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))

      if (categoryId) {
        const targetCategory = categories.find(
          (c) => c.id === categoryId || (c.name && c.name.toLowerCase() === String(categoryId).toLowerCase())
        )

        const filtered = items.filter((item) => {
          const itemCatId = item.master_category_id || item.category_id || item.category?.id
          const itemCatName = (item.category?.name || item.MasterCategory?.name || '').toLowerCase()
          if (itemCatId && itemCatId === categoryId) return true
          if (targetCategory) {
            if (itemCatId && itemCatId === targetCategory.id) return true
            if (itemCatName && itemCatName === targetCategory.name.toLowerCase()) return true
          }
          if (itemCatName && itemCatName === String(categoryId).toLowerCase()) return true
          return false
        })

        return filtered.map((item) => transformProcess(item, catMap))
      }

      return items.map((item) => transformProcess(item, catMap))
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
        const [processesRes, categoriesRes] = await Promise.all([
          ftth.getMasterProcesses().catch(() => []),
          ftth.getMasterCategories().catch(() => []),
        ])
        const items = Array.isArray(processesRes) ? processesRes : (processesRes.data || [])
        const cats = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes.data || [])
        const catMap = Object.fromEntries(cats.map((c) => [c.id, c]))
        return items.map((item) => transformProcess(item, catMap))
      } catch (error) {
        console.error('Error fetching processes from FTTH:', error.message)
        throw masterError('FTTH_ERROR', 'Gagal mengambil data proses dari FTTH: ' + error.message)
      }
    }
    throw masterError('NOT_FOUND', 'Master data tidak dikenal.')
  }

  async function create(resource, data) {
    if (resource === 'process' || resource === 'pekerjaan') {
      const payload = {
        name: data.name || data.namaPekerjaan,
        description: data.description || data.deskripsi || '',
        master_category_id: data.master_category_id || data.categoryId || data.kategoriId,
        allow_file: data.allow_file !== false,
        allow_text: data.allow_text !== false,
        input_instruction: data.input_instruction || data.instruksiDokumentasi || '',
      }
      const res = await ftth.createMasterProcess(payload)
      return { message: 'Master pekerjaan berhasil ditambahkan ke FTTH Core.', data: res }
    }
    return { message: 'Data berhasil disimpan.' }
  }

  async function update(resource, id, data) {
    if (resource === 'process' || resource === 'pekerjaan') {
      const payload = {}
      if (data.name || data.namaPekerjaan) payload.name = data.name || data.namaPekerjaan
      if (data.description !== undefined || data.deskripsi !== undefined) payload.description = data.description ?? data.deskripsi
      if (data.master_category_id || data.categoryId || data.kategoriId) payload.master_category_id = data.master_category_id || data.categoryId || data.kategoriId
      if (data.input_instruction !== undefined || data.instruksiDokumentasi !== undefined) payload.input_instruction = data.input_instruction ?? data.instruksiDokumentasi
      if (data.isActive !== undefined || data.is_active !== undefined) payload.is_active = data.isActive !== undefined ? data.isActive : data.is_active

      const res = await ftth.updateMasterProcess(id, payload)
      return { message: 'Master pekerjaan berhasil diperbarui di FTTH Core.', data: res }
    }
    if (resource === 'cluster' || resource === 'rw') {
      const res = await ftth.updateCluster(id, data)
      return { message: 'Cluster berhasil diperbarui di FTTH Core.', data: res }
    }
    return { message: 'Data berhasil diperbarui.' }
  }

  async function setActive(resource, id, isActive) {
    return update(resource, id, { isActive })
  }

  async function remove(resource, id) {
    if (resource === 'process' || resource === 'pekerjaan') {
      const res = await ftth.deleteMasterProcess(id)
      return { message: 'Master pekerjaan berhasil dihapus dari FTTH Core.', data: res }
    }
    return { message: 'Data berhasil dihapus.' }
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
    create,
    update,
    setActive,
    delete: remove,
    remove,
  }
}
