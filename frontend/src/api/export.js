const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function exportReports(params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value))
  const response = await fetch(`${API_URL}/api/admin/laporan/export${query.toString() ? `?${query}` : ''}`, { credentials: 'include' })
  if (!response.ok) throw new Error('Ekspor gagal.')
  return response.blob()
}
