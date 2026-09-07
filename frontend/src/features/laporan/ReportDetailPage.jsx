import { useEffect, useState, useCallback } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { historyApi } from '../../api/history.js'
import { updateReportStatus } from '../../api/reports.js'
import { resolveFileUrl } from '../../utils/fileUrl.js'
import PageHeader from '../../components/PageHeader.jsx'
import PageState from '../../components/PageState.jsx'
import Icon from '../../components/Icon.jsx'
import Notice from '../../components/Notice.jsx'

const STATUS_LABELS = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
}

function isImageFile(item) {
  return (
    item.mime_type?.startsWith('image/') ||
    item.mimeType?.startsWith('image/') ||
    /\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(
      item.original_name || item.originalName || item.signedUrl || item.storagePath || item.file_url || ''
    )
  )
}

export default function ReportDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const [report, setReport] = useState(null)
  const [state, setState] = useState('loading')
  const [notice, setNotice] = useState('')
  const [updating, setUpdating] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(null)
  const isAdmin = location.pathname.startsWith('/admin')

  useEffect(() => {
    historyApi
      .getDetail(id)
      .then((response) => {
        setReport(response.data || response)
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [id])

  const allDocs = report?.dokumentasi || report?.dokumentasi_laporan || []
  const dokumentasi = allDocs.filter(
    (item) => !item.laporan_id || item.laporan_id === report?.id || !report?.id
  )

  const handleKeyDown = useCallback(
    (event) => {
      if (previewIndex === null) return
      if (event.key === 'Escape') {
        setPreviewIndex(null)
      } else if (event.key === 'ArrowRight' && dokumentasi.length > 1) {
        setPreviewIndex((prev) => (prev + 1) % dokumentasi.length)
      } else if (event.key === 'ArrowLeft' && dokumentasi.length > 1) {
        setPreviewIndex((prev) => (prev - 1 + dokumentasi.length) % dokumentasi.length)
      }
    },
    [previewIndex, dokumentasi.length]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  async function handleApprove() {
    if (!report) return
    setUpdating(true)
    try {
      await updateReportStatus(report.id, 'APPROVED', 'Laporan disetujui.')
      setReport((curr) => curr ? { ...curr, status: 'APPROVED' } : null)
      setNotice('Status laporan berhasil diubah menjadi Disetujui.')
    } catch {
      setNotice('Gagal memperbarui status laporan.')
    } finally {
      setUpdating(false)
    }
  }

  async function handleReject() {
    if (!report) return
    const catatan = prompt('Masukkan catatan penolakan:')
    if (catatan === null) return
    setUpdating(true)
    try {
      await updateReportStatus(report.id, 'REJECTED', catatan)
      setReport((curr) => curr ? { ...curr, status: 'REJECTED' } : null)
      setNotice('Status laporan berhasil diubah menjadi Ditolak.')
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
  const editAction = report.canEdit ? (
    <Link
      className="primary-button"
      to={`${isAdmin ? '/admin' : '/pegawai'}/laporan/${report.id}/edit`}
    >
      Edit laporan
    </Link>
  ) : null

  const currentStatus = report.status || 'PENDING'
  const activeItem = previewIndex !== null ? dokumentasi[previewIndex] : null
  const activeFileUrl = activeItem
    ? resolveFileUrl(activeItem.signedUrl || activeItem.file_url || activeItem.storagePath)
    : ''
  const activeIsImg = activeItem ? isImageFile(activeItem) : false

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
              <div className="detail-actions">
                {currentStatus === 'PENDING' && (
                  <>
                    <button
                      className="primary-button"
                      disabled={updating}
                      onClick={handleApprove}
                    >
                      {updating ? 'Memproses...' : 'Setujui'}
                    </button>
                    <button
                      className="warning-button"
                      disabled={updating}
                      onClick={handleReject}
                    >
                      Tolak
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <dl>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`status-badge ${
                  currentStatus === 'APPROVED' ? 'active' :
                  currentStatus === 'REJECTED' ? 'rejected' : 'pending'
                }`}>
                  {STATUS_LABELS[currentStatus] || currentStatus}
                </span>
              </dd>
            </div>
            <div>
              <dt>Tanggal</dt>
              <dd>{String(report.tanggal_kegiatan || report.tanggalKegiatan || '-').slice(0, 10)}</dd>
            </div>
            {report.created_at || report.createdAt ? (
              <div>
                <dt>Dikirim</dt>
                <dd>{new Date(report.created_at || report.createdAt).toLocaleString('id-ID')}</dd>
              </div>
            ) : null}
            <div>
              <dt>Project</dt>
              <dd>{report.project?.name || report.project_name || report.cluster?.desa?.namaDesa || report.desa?.namaDesa || '-'}</dd>
            </div>
            <div>
              <dt>Cluster</dt>
              <dd>{report.cluster?.name || report.cluster?.clusterName || report.cluster_name || report.rw?.nomorRw || '-'}</dd>
            </div>
            <div>
              <dt>Pekerjaan</dt>
              <dd>{report.process?.name || report.master_process?.name || report.process_name || report.pekerjaan?.namaPekerjaan || report.pekerjaan?.name || '-'}</dd>
            </div>
            {(report.nomor_perangkat || report.nomorPerangkat) && (
              <div>
                <dt>Nomor perangkat</dt>
                <dd>{report.nomor_perangkat || report.nomorPerangkat}</dd>
              </div>
            )}
            {report.catatan_revisi && (
              <div>
                <dt>Catatan Revisi</dt>
                <dd>{report.catatan_revisi}</dd>
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
              <p>{dokumentasi.length} file tersimpan (klik gambar untuk membuka)</p>
            </div>
          </div>
          <div className="detail-gallery">
            {dokumentasi.map((item, index) => {
              const isImg = isImageFile(item)
              const fileUrl = resolveFileUrl(item.signedUrl || item.file_url || item.storagePath)
              const fileName = item.original_name || item.originalName || 'Lampiran'
              return (
                <figure
                  key={item.id || item.storagePath || item.file_url || index}
                  className="detail-gallery-figure clickable-attachment"
                  onClick={() => setPreviewIndex(index)}
                  title="Klik untuk membuka lampiran"
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setPreviewIndex(index)
                    }
                  }}
                >
                  {isImg ? (
                    <div className="detail-gallery-img-wrap">
                      <img src={fileUrl} alt={fileName} />
                      <div className="detail-gallery-overlay">
                        <span>🔍 Buka Lampiran</span>
                      </div>
                    </div>
                  ) : (
                    <div className="file-icon-large">
                      {item.mime_type === 'application/pdf' ? '📄' :
                       item.mime_type?.includes('spreadsheet') || item.mimeType?.includes('spreadsheet') ? '📊' :
                       item.mime_type?.includes('kmz') || item.mimeType?.includes('kmz') ? '🗺️' : '📎'}
                    </div>
                  )}
                  <figcaption>
                    <div className="attachment-caption-content">
                      <span className="attachment-name">
                        <Icon name="photo" />
                        {fileName}
                      </span>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="attachment-external-link"
                        onClick={(e) => e.stopPropagation()}
                        title="Buka lampiran di tab baru"
                      >
                        Buka ↗
                      </a>
                    </div>
                  </figcaption>
                </figure>
              )
            })}
            {!dokumentasi.length && (
              <p className="empty-state">Belum ada dokumentasi.</p>
            )}
          </div>
        </article>
      </div>

      {previewIndex !== null && activeItem && (
        <div
          className="media-lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Lampiran Dokumentasi"
          onClick={() => setPreviewIndex(null)}
        >
          <div
            className="media-lightbox-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="media-lightbox-header">
              <div className="media-lightbox-title">
                <h3>{activeItem.original_name || activeItem.originalName || 'Lampiran'}</h3>
                <small>Berkas {previewIndex + 1} dari {dokumentasi.length}</small>
              </div>
              <div className="media-lightbox-actions">
                <a
                  href={activeFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="secondary-button icon-label"
                  download={activeItem.original_name || activeItem.originalName}
                >
                  <Icon name="externalLink" size={16} />
                  Buka Tab Baru
                </a>
                <button
                  type="button"
                  className="lightbox-close-button"
                  onClick={() => setPreviewIndex(null)}
                  aria-label="Tutup pratinjau"
                >
                  <Icon name="close" size={20} />
                </button>
              </div>
            </div>

            <div className="media-lightbox-body">
              {activeIsImg ? (
                <div className="media-lightbox-img-container">
                  <img
                    src={activeFileUrl}
                    alt={activeItem.original_name || activeItem.originalName || 'Lampiran'}
                  />
                </div>
              ) : (
                <div className="media-lightbox-doc">
                  <div className="doc-icon-huge">
                    {activeItem.mime_type === 'application/pdf' ? '📄' :
                     activeItem.mime_type?.includes('spreadsheet') ? '📊' :
                     activeItem.mime_type?.includes('kmz') ? '🗺️' : '📎'}
                  </div>
                  <p>{activeItem.original_name || activeItem.originalName}</p>
                  <a
                    href={activeFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="primary-button icon-label"
                  >
                    <Icon name="externalLink" size={16} />
                    Unduh / Buka Dokumen
                  </a>
                </div>
              )}
            </div>

            {dokumentasi.length > 1 && (
              <div className="media-lightbox-footer">
                <button
                  type="button"
                  className="secondary-button icon-label"
                  onClick={() =>
                    setPreviewIndex((previewIndex - 1 + dokumentasi.length) % dokumentasi.length)
                  }
                >
                  <Icon name="chevronLeft" size={16} />
                  Sebelumnya
                </button>
                <span className="media-lightbox-counter">
                  {previewIndex + 1} / {dokumentasi.length}
                </span>
                <button
                  type="button"
                  className="secondary-button icon-label"
                  onClick={() =>
                    setPreviewIndex((previewIndex + 1) % dokumentasi.length)
                  }
                >
                  Selanjutnya
                  <Icon name="chevronRight" size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}