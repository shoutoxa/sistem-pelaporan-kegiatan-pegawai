import { useEffect, useState } from 'react'
import { ftthApi } from '../../api/ftth.js'
import './ftth.css'

const labels = { PENDING: 'Menunggu', APPROVED: 'Diterima', REJECTED: 'Perlu revisi' }
export default function ClusterReportingStatus({ userId, selectableClusters, selectedId, onSelect, disabled = false, refreshVersion = 0 }) {
  const [result, setResult] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const refresh = () => setAttempt((x) => x + 1)
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true); setError('')
      const [assignments, status] = await Promise.allSettled([ftthApi.userClusters(userId), ftthApi.userReportStatus(userId)])
      if (!active) return
      if (assignments.status === 'rejected' || !Array.isArray(assignments.value)) {
        setResult(null); setError('Penugasan cluster belum dapat dimuat. Coba lagi.')
      } else {
        const daily = status.status === 'fulfilled' ? status.value : null
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
        const valid = daily?.user_id === userId && daily.tanggal === today && typeof daily.wajib_lapor === 'boolean' && Array.isArray(daily.clusters)
        setResult({ clusters: assignments.value, daily: valid ? daily : null })
        if (!valid) setError('Status harian belum tersedia. Penugasan tetap ditampilkan; status tidak dianggap belum lapor.')
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [userId, attempt, refreshVersion])
  const complete = result?.clusters.filter((c) => result.daily?.clusters.some((s) => s.cluster_id === c.id && s.sudah_lapor === true)).length || 0
  return <section className="ftth-cluster-status" aria-label="Status pelaporan per cluster" aria-busy={loading}>
    <header><div><h2>Status pelaporan per cluster</h2><p>{result?.daily ? `Tanggal ${result.daily.tanggal} (WIB)` : 'Data penugasan resmi perusahaan'}</p></div>
      <button type="button" className="secondary-button" disabled={loading || disabled} onClick={() => setAttempt((x) => x + 1)}>Muat ulang status</button></header>
    {loading ? <p role="status">Memuat status cluster…</p> : <>
      {error && <p role="alert" className="ftth-error">{error}</p>}
      {result?.daily?.wajib_lapor === false && <p>Akun ini tidak wajib lapor harian.</p>}
      {result?.daily?.wajib_lapor === true && <p>{complete} dari {result.clusters.length} cluster sudah dilaporkan hari ini.</p>}
      {result && !result.clusters.length && <p>Belum ada cluster aktif yang ditugaskan.</p>}
      <div className="ftth-cluster-grid">{result?.clusters.map((cluster) => {
        const status = result.daily?.clusters.find((s) => s.cluster_id === cluster.id)
        const selectable = selectableClusters?.find((c) => c.id === cluster.id && c.project_id === cluster.project_id)
        const reported = status?.sudah_lapor
        return <article key={cluster.id} className={selectedId === cluster.id ? 'is-selected' : ''}>
          <h3>{cluster.name}</h3>{status?.project_name && <p>{status.project_name}</p>}
          <span className={`ftth-status ${reported === true ? 'ftth-status-APPROVED' : ''}`}>{result.daily?.wajib_lapor === false ? 'Tidak wajib lapor' : reported === true ? `Sudah lapor · ${labels[status.laporan_status] || 'Tercatat'}` : reported === false ? 'Belum lapor' : 'Status belum tersedia'}</span>
          {onSelect && selectable && <button type="button" className="secondary-button" disabled={disabled || selectedId === cluster.id} onClick={() => onSelect(selectable)}
            aria-label={`Pilih cluster ${cluster.name}`}>{selectedId === cluster.id ? 'Cluster terpilih' : 'Pilih cluster ini'}</button>}
        </article>
      })}</div>
    </>}
  </section>
}
