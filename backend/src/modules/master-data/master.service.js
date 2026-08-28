import { masterSchemas, normalizeClusterName, normalizeSpaces } from './master.schemas.js'

const models = { desa: 'desa', cluster: 'cluster', pekerjaan: 'pekerjaan' }

function masterError(code, message = code) {
  const error = new Error(message)
  error.code = code
  return error
}

export function createMasterService({ prisma }) {
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

  async function listActivePekerjaan() {
    return prisma.pekerjaan.findMany({ where: { isActive: true }, orderBy: { namaPekerjaan: 'asc' } })
  }

  async function listAdmin(resource) {
    return modelFor(resource).findMany({
      orderBy: resource === 'cluster' ? { clusterName: 'asc' } : resource === 'desa' ? { namaDesa: 'asc' } : { namaPekerjaan: 'asc' },
      ...(resource === 'cluster' ? { include: { desa: true } } : {}),
    })
  }

  async function create(resource, input) {
    const parsed = masterSchemas[resource]?.safeParse(input)
    if (!parsed?.success) throw masterError('VALIDATION', 'Data master tidak valid.')
    const data = { ...parsed.data }

    if (resource === 'desa') {
      data.namaDesa = normalizeSpaces(data.namaDesa)
      if (await prisma.desa.findFirst({ where: { namaDesa: data.namaDesa } })) throw masterError('DUPLICATE', 'Nama Desa sudah digunakan.')
    }
    if (resource === 'cluster') {
      data.clusterName = normalizeClusterName(data.clusterName)
      const parent = await prisma.desa.findUnique({ where: { id: data.desaId } })
      if (!parent || !parent.isActive) throw masterError('INACTIVE_PARENT', 'Desa tidak aktif atau tidak ditemukan.')
      if (await prisma.cluster.findFirst({ where: { desaId_clusterName: { desaId: data.desaId, clusterName: data.clusterName } } })) throw masterError('DUPLICATE', 'Nama RW sudah digunakan pada Desa tersebut.')
    }
    if (resource === 'pekerjaan') {
      data.namaPekerjaan = normalizeSpaces(data.namaPekerjaan)
      if (await prisma.pekerjaan.findFirst({ where: { namaPekerjaan: data.namaPekerjaan } })) throw masterError('DUPLICATE', 'Nama Pekerjaan sudah digunakan.')
    }
    return modelFor(resource).create({ data })
  }

  async function update(resource, id, input) {
    const parsed = masterSchemas[resource]?.safeParse(input)
    if (!parsed?.success) throw masterError('VALIDATION', 'Data master tidak valid.')
    const data = { ...parsed.data }
    if (resource === 'desa') data.namaDesa = normalizeSpaces(data.namaDesa)
    if (resource === 'cluster') data.clusterName = normalizeClusterName(data.clusterName)
    if (resource === 'pekerjaan') data.namaPekerjaan = normalizeSpaces(data.namaPekerjaan)
    return modelFor(resource).update({ where: { id }, data })
  }

  async function setActive(resource, id, isActive) {
    if (typeof isActive !== 'boolean') throw masterError('VALIDATION', 'Status aktif harus boolean.')
    return modelFor(resource).update({ where: { id }, data: { isActive } })
  }

  return { listActiveDesa, listActiveClusterByDesa, listActivePekerjaan, listAdmin, create, update, setActive }
}
