import { rows, fail } from './ftth-report.schemas.js'

export function createFtthMasterService(client) {
  async function paginated(fetchPage) {
    const result = []
    const seen = new Set()
    for (let offset = 0; offset < 10000; offset += 1000) {
      const batch = rows(await fetchPage({ limit: 1000, offset }))
      for (const item of batch) {
        if (seen.has(item.id)) throw fail('INTEGRATION_INVALID_RESPONSE', 'Pagination FTTH mengembalikan ID berulang.')
        seen.add(item.id)
        result.push(item)
      }
      if (batch.length < 1000) return result
    }
    throw fail('INTEGRATION_INVALID_RESPONSE', 'Jumlah master FTTH melebihi batas pemuatan.')
  }
  return {
    async snapshot() {
      if (!client.configured) throw fail('INTEGRATION_NOT_CONFIGURED', 'API FTTH belum dikonfigurasi.')
      const [projects, clusters, categories, processes] = await Promise.all([
        paginated(client.listProjects), paginated(client.listClusters),
        client.listCategories().then(rows), client.listProcesses().then(rows),
      ])
      const projectNames = new Map(projects.map(x => [x.id, x.name || x.project_name || x.id]))
      const categoryNames = new Map(categories.map(x => [x.id, x.name || x.id]))
      if (clusters.some(x => !projectNames.has(x.project_id)) || processes.some(x => !categoryNames.has(x.master_category_id))) {
        throw fail('INTEGRATION_INVALID_RESPONSE', 'Relasi project/cluster atau kategori/pekerjaan FTTH tidak lengkap.')
      }
      const common = x => ({ id: x.id, name: x.name || x.project_name || x.cluster_name || x.id, isActive: x.is_active !== false })
      return {
        source: 'ftth', readOnly: true,
        projects: projects.map(common), categories: categories.map(common),
        clusters: clusters.map(x => ({ ...common(x), projectId: x.project_id, projectName: projectNames.get(x.project_id) })),
        processes: processes.map(x => ({ ...common(x), categoryId: x.master_category_id, categoryName: categoryNames.get(x.master_category_id), source: x.source })),
      }
    },
  }
}
