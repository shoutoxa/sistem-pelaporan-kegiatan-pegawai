export function resolveFileUrl(pathOrUrl) {
  if (!pathOrUrl) return ''
  const str = String(pathOrUrl).trim()
  if (
    str.startsWith('http://') ||
    str.startsWith('https://') ||
    str.startsWith('data:') ||
    str.startsWith('blob:')
  ) {
    return str
  }
  if (str.startsWith('/uploads/')) {
    return `https://ftth.digitak.id${str}`
  }
  if (str.startsWith('/api/files/')) {
    return str
  }
  const clean = str.replace(/^\/+/, '')
  return `/api/files/${clean}`
}
