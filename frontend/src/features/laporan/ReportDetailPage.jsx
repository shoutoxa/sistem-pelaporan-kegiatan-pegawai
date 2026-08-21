import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { historyApi } from '../../api/history.js'

export default function ReportDetailPage() {
  const { id } = useParams()
  const [report, setReport] = useState(null)
  const [state, setState] = useState('loading')
  useEffect(() => { historyApi.getDetail(id).then((response) => { setReport(response.data); setState('ready') }).catch(() => setState('error')) }, [id])
  if (state === 'loading') return <section className="page"><p role="status">Memuat detail...</p></section>
  if (state === 'error' || !report) return <section className="page"><p role="alert">Detail laporan tidak ditemukan.</p></section>
  return <section className="page"><h1>Detail Laporan</h1><p>{report.keterangan}</p><div className="preview-grid">{(report.dokumentasi || []).map((item) => <figure key={item.id || item.storagePath}><img src={item.signedUrl} alt={item.originalName} /><figcaption>{item.originalName}</figcaption></figure>)}</div></section>
}
