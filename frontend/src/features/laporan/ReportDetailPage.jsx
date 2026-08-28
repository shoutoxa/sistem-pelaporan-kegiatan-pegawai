import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { historyApi } from '../../api/history.js'
import { updateDiterimaStatus } from '../../api/reports.js'
import PageHeader from '../../components/PageHeader.jsx'
import PageState from '../../components/PageState.jsx'
import Icon from '../../components/Icon.jsx'
import Notice from '../../components/Notice.jsx'

export default function ReportDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const [report, setReport] = useState(null)
  const [state, setState] = useState('loading')
  const [notice, setNotice] = useState('')
  const [updating, setUpdating] = useState(false)
  const isAdmin = location.pathname.startsWith('/admin')

  useEffect(() => {
    historyApi
      .getDetail(id)
      .then((response) => {
        setReport(response.data)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [id])

  async function handleToggleDiterima() {
    if (!report) return
    setUpdating(true)
    const newStatus = !report.diterima
    try {
      await updateDiterimaStatus(report.id, newStatus)
      setReport((curr) => curr ? { ...curr, diterima: newStatus } : null)
      setNotice(`Status laporan berhasil diubah menjadi ${newStatus ? 'Diterima' : 'Menunggu'}.`)
    } catch {
      setNotice('Gagal memperbarui status laporan.')
    } finally {
      setUpdating(false)
    }
  }

  if (state === 'loading')
    return (
      <section className="page">
        <PageState
          title="Menyiapkan detail laporan"
          message="Mengambil data kegiatan dan dokumentasi."
        />
      </section>
    )
  if (state === 'error' || !report)
    return (
      <section className="page">
        <PageState
          tone="error"
          title="Detail laporan tidak ditemukan"
          message="Laporan mungkin sudah tidak tersedia atau Anda tidak memiliki akses."
        />
      </section>
    )
  const backTo = isAdmin ? '/admin/laporan' : '/pegawai/histori'
  const editAction =
    report.canEdit && !isAdmin ? (
      <Link
        className="primary-button"
        to={`/pegawai/laporan/${report.id}/edit`}
      >
        Edit laporan
      </Link>
    ) : null

  return (
    <section className="page">
      <Link className="back-link icon-label" to={backTo}>
        <Icon name="arrowLeft" />
        Kembali ke daftar laporan
      </Link>
      <PageHeader
        title="Detail laporan"
        description="Informasi kegiatan dan dokumentasi yang tersimpan."
        action={editAction}
      />
      {notice && <Notice tone="info">{notice}</Notice>}
      <div className="detail-grid">
        <article className="data-section detail-card">
          <div className="section-heading">
            <div>
              <h2>Informasi kegiatan</h2>
              <p>Data yang dikirim oleh pegawai.</p>
            </div>
            {isAdmin && (
              <button
                className={report.diterima ? 'warning-button' : 'primary-button'}
                disabled={updating}
                onClick={handleToggleDiterima}
              >
                {updating ? 'Memproses...' : report.diterima ? 'Batalkan Penerimaan' : 'Tandai Diterima'}
              </button>
            )}
          </div>
          <dl>
            {report.user?.nama && (
              <div>
                <dt>PIC</dt>
                <dd>{report.user.nama} {report.user.nomorHp ? `(${report.user.nomorHp})` : ''}</dd>
              </div>
            )}
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`status-badge ${report.diterima ? 'active' : 'pending'}`}>
                  {report.diterima ? 'Diterima' : 'Menunggu'}
                </span>
              </dd>
            </div>
            <div>
              <dt>Tanggal</dt>
              <dd>{String(report.tanggalKegiatan || '-').slice(0, 10)}</dd>
            </div>
            {report.createdAt && (
              <div>
                <dt>Dikirim</dt>
                <dd>{new Date(report.createdAt).toLocaleString('id-ID')}</dd>
              </div>
            )}
            <div>
              <dt>Lokasi</dt>
              <dd>
                {report.cluster?.desa?.namaDesa || '-'} · {report.cluster?.clusterName || '-'}
              </dd>
            </div>
            <div>
              <dt>Pekerjaan</dt>
              <dd>{report.pekerjaan?.namaPekerjaan || '-'}</dd>
            </div>
            {report.nomorPerangkat && (
              <div>
                <dt>Nomor perangkat</dt>
                <dd>{report.nomorPerangkat}</dd>
              </div>
            )}
            <div className="detail-description">
              <dt>Keterangan</dt>
              <dd>{report.keterangan}</dd>
            </div>
          </dl>
        </article>
        <article className="data-section gallery-card">
          <div className="section-heading">
            <div>
              <h2>Dokumentasi</h2>
              <p>{(report.dokumentasi || []).length} foto tersimpan</p>
            </div>
          </div>
          <div className="detail-gallery">
            {(report.dokumentasi || []).map((item, index) => (
              <figure key={item.id || item.storagePath || index}>
                <img src={item.signedUrl} alt={item.originalName} />
                <figcaption>
                  <Icon name="photo" />
                  {item.originalName}
                </figcaption>
              </figure>
            ))}
            {!report.dokumentasi?.length && (
              <p className="empty-state">Belum ada dokumentasi.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}
