export const newReportFields = () => ({ project_id: '', cluster_id: '', category_id: '', process_id: '',
  tanggal_kegiatan: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
  nomor_perangkat: '', status: 'ON_PROGRESS', kendala_lapangan: '', keterangan: '' })

export function reportDraftKey(user) {
  return user?.id ? `ftth-report-draft:v1:${user.authSource || 'local'}:${user.externalUserId || user.id}` : null
}
export function readReportDraft(key) {
  if (!key) return null
  try {
    const value = JSON.parse(localStorage.getItem(key))
    if (!value || typeof value !== 'object') return null
    const fields = newReportFields()
    for (const name of Object.keys(fields)) {
      if (typeof value[name] === 'string') fields[name] = value[name].slice(0, name === 'keterangan' || name === 'kendala_lapangan' ? 2000 : 100)
    }
    fields.status = ['ON_PROGRESS', 'SELESAI', 'KENDALA'].includes(value.status) ? value.status : 'ON_PROGRESS'
    if (!fields.kendala_lapangan) fields.kendala_lapangan = fields.keterangan
    return fields
  } catch { return null }
}
export function saveReportDraft(key, fields) {
  if (!key) return false
  try {
    const empty = newReportFields()
    const data = Object.fromEntries(Object.keys(empty).map((name) => [name, fields[name]]))
    if (Object.keys(empty).some((name) => data[name] !== empty[name])) localStorage.setItem(key, JSON.stringify(data))
    else localStorage.removeItem(key)
    return true
  } catch { return false }
}
export function clearReportDraft(key) {
  try { if (key) localStorage.removeItem(key) } catch { /* Browser storage may be disabled. */ }
}
export function reconcileReportFields(fields, refs) {
  const next = { ...fields }
  if (!refs.projects.some((p) => p.id === next.project_id)) next.project_id = ''
  if (!refs.clusters.some((c) => c.id === next.cluster_id && c.project_id === next.project_id)) next.cluster_id = ''
  if (!refs.categories.some((c) => c.id === next.category_id)) next.category_id = ''
  if (!refs.processes.some((p) => p.id === next.process_id && p.master_category_id === next.category_id &&
    (!p.cluster_ids || p.cluster_ids.includes(next.cluster_id)))) next.process_id = ''
  return next
}
