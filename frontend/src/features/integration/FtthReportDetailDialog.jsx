import { useEffect, useState } from 'react'
import { ftthApi } from '../../api/ftth.js'
import FtthDialog from './FtthDialog.jsx'
import FtthAttachments from './FtthAttachments.jsx'

const labels = { PENDING: 'Menunggu', APPROVED: 'Diterima', REJECTED: 'Perlu revisi' }

export default function FtthReportDetailDialog({ report, onClose, children }) {
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let ignore = false
    ftthApi.detail(report.id).then((data) => { if (!ignore) setDetail(data) })
      .catch((e) => { if (!ignore) setError(e.message || 'Detail gagal dimuat.') })
    return () => { ignore = true }
  }, [report.id, attempt])
  const item = { ...report, ...detail }
  return <FtthDialog title="Detail laporan" responsive onClose={onClose}>
    <section className="ftth-detail-summary" aria-label="Informasi laporan">
      <div className="ftth-report-heading"><time>{item.tanggal_kegiatan?.slice(0, 10)}</time>
        <span className={`ftth-status ftth-status-${item.status}`}>{labels[item.status] || item.status}</span></div>
      <h3>{item.process_name || 'Laporan kegiatan'}</h3>
      <div className="ftth-detail-location"><strong>{item.project_name}</strong><span>{item.cluster_name}</span></div>
      {item.nomor_perangkat && <p>Nomor perangkat: {item.nomor_perangkat}</p>}
      <p className="ftth-detail-description">{item.keterangan}</p>
      {item.catatan_revisi && <p>Catatan revisi: {item.catatan_revisi}</p>}
    </section>
    <section aria-label="Lampiran laporan">
      <h3>Lampiran</h3>
      {error ? <><p role="alert">{error}</p><button type="button" className="secondary-button" onClick={() => { setError(''); setAttempt((n) => n + 1) }}>Coba lagi</button></>
        : detail ? <FtthAttachments items={detail.dokumentasi || []} inlinePreview /> : <p role="status">Memuat lampiran…</p>}
    </section>
    {children}
  </FtthDialog>
}
