import { masterSchemas, normalizeRw, normalizeSpaces } from './master.schemas.js'

const models = { desa: 'desa', rw: 'rw', tahapan: 'tahapan' }

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

  async function listActiveRwByDesa(desaId) {
    return prisma.rw.findMany({ where: { desaId, isActive: true }, orderBy: { nomorRw: 'asc' } })
  }

  async function listActiveTahapan() {
    return prisma.tahapan.findMany({ where: { isActive: true }, orderBy: { namaTahapan: 'asc' } })
  }

  async function listAdmin(resource) {
    return modelFor(resource).findMany({ orderBy: resource === 'rw' ? { nomorRw: 'asc' } : resource === 'desa' ? { namaDesa: 'asc' } : { namaTahapan: 'asc' } })
  }

  async function create(resource, input) {
    const parsed = masterSchemas[resource]?.safeParse(input)
    if (!parsed?.success) throw masterError('VALIDATION', 'Data master tidak valid.')
    const data = { ...parsed.data }

    if (resource === 'desa') {
      data.namaDesa = normalizeSpaces(data.namaDesa)
      if (await prisma.desa.findFirst({ where: { namaDesa: data.namaDesa } })) throw masterError('DUPLICATE', 'Nama Desa sudah digunakan.')
    }
    if (resource === 'rw') {
      data.nomorRw = normalizeRw(data.nomorRw)
      const parent = await prisma.desa.findUnique({ where: { id: data.desaId } })
      if (!parent || !parent.isActive) throw masterError('INACTIVE_PARENT', 'Desa tidak aktif atau tidak ditemukan.')
      if (await prisma.rw.findFirst({ where: { desaId_nomorRw: { desaId: data.desaId, nomorRw: data.nomorRw } } })) throw masterError('DUPLICATE', 'Nomor RW sudah digunakan pada Desa tersebut.')
    }
    if (resource === 'tahapan') {
      data.namaTahapan = normalizeSpaces(data.namaTahapan)
      if (await prisma.tahapan.findFirst({ where: { namaTahapan: data.namaTahapan } })) throw masterError('DUPLICATE', 'Nama Tahapan sudah digunakan.')
    }
    return modelFor(resource).create({ data })
  }

  async function update(resource, id, input) {
    const parsed = masterSchemas[resource]?.safeParse(input)
    if (!parsed?.success) throw masterError('VALIDATION', 'Data master tidak valid.')
    const data = { ...parsed.data }
    if (resource === 'desa') data.namaDesa = normalizeSpaces(data.namaDesa)
    if (resource === 'rw') data.nomorRw = normalizeRw(data.nomorRw)
    if (resource === 'tahapan') data.namaTahapan = normalizeSpaces(data.namaTahapan)
    return modelFor(resource).update({ where: { id }, data })
  }

  async function setActive(resource, id, isActive) {
    if (typeof isActive !== 'boolean') throw masterError('VALIDATION', 'Status aktif harus boolean.')
    return modelFor(resource).update({ where: { id }, data: { isActive } })
  }

  return { listActiveDesa, listActiveRwByDesa, listActiveTahapan, listAdmin, create, update, setActive }
}
