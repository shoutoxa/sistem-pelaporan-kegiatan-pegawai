import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { historyApi } from '../../api/history.js'

export default function ReportDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const [report, setReport] = useState(null)
  const [state, setState] = useState('loading')
  useEffect(() => { historyApi.getDetail(id).then((response) => { setReport(response.data); setState('ready') }).catch(() => setState('error')) }, [id])
  if (state === 'loading') return <section className="page"><p role="status">Memuat detail...</p></section>
  if (state === 'error' || !report) return <section className="page"><p role="alert">Detail laporan tidak ditemukan.</p></section>
  const backTo = location.pathname.startsWith('/admin') ? '/admin/laporan' : '/pegawai/histori'
  return <section className="page"><Link className="back-link" to={backTo}>← Kembali ke daftar laporan</Link><div className="page-heading"><div><p className="eyebrow">Dokumentasi kegiatan</p><h1>Detail Laporan</h1><p>Informasi lengkap dan foto lapangan yang tersimpan.</p></div></div><div className="detail-grid"><article className="panel detail-card"><h2>Informasi kegiatan</h2><dl><div><dt>Tanggal</dt><dd>{String(report.tanggalKegiatan || '-').slice(0, 10)}</dd></div><div><dt>Lokasi</dt><dd>{report.rw?.desa?.namaDesa || '-'} · {report.rw?.nomorRw || '-'}</dd></div><div><dt>Tahapan</dt><dd>{report.tahapan?.namaTahapan || '-'}</dd></div>{report.nomorPerangkat && <div><dt>Nomor perangkat</dt><dd>{report.nomorPerangkat}</dd></div>}<div><dt>Keterangan</dt><dd>{report.keterangan}</dd></div></dl></article><article className="panel gallery-card"><div className="table-heading"><h2>Dokumentasi</h2><span className="count-badge">{(report.dokumentasi || []).length} foto</span></div><div className="preview-grid detail-gallery">{(report.dokumentasi || []).map((item) => <figure key={item.id || item.storagePath}><img src={item.signedUrl} alt={item.originalName} /><figcaption>{item.originalName}</figcaption></figure>)}{!report.dokumentasi?.length && <p className="empty-state">Belum ada dokumentasi.</p>}</div></article></div></section>
}
