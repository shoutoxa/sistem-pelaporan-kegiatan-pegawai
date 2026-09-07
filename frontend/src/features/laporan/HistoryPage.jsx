import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { historyApi } from '../../api/history.js'
import { masterApi } from '../../api/master.js'
import { resolveFileUrl } from '../../utils/fileUrl.js'
import PageHeader from '../../components/PageHeader.jsx'
import PageState from '../../components/PageState.jsx'
import Icon from '../../components/Icon.jsx'

function isImageFile(item) {
  return (
    item?.mime_type?.startsWith('image/') ||
    item?.mimeType?.startsWith('image/') ||
    /\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(
      item?.original_name || item?.originalName || item?.signedUrl || item?.storagePath || item?.file_url || ''
    )
  )
}

export default function HistoryPage() {
  const [result, setResult] = useState({ items: [], total: 0 })
  const [state, setState] = useState('loading')
  const [filters, setFilters] = useState({
    tanggal: '',
    processId: '',
    page: 1,
    limit: 20,
  })
  const [categories, setCategories] = useState([])
  const [requestVersion, setRequestVersion] = useState(0)
  const [previewModal, setPreviewModal] = useState(null)

  useEffect(() => {
    if (!previewModal) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setPreviewModal(null)
      } else if (e.key === 'ArrowLeft' && previewModal.docs.length > 1) {
        setPreviewModal((prev) =>
          prev
            ? {
                ...prev,
                activeIndex:
                  (prev.activeIndex - 1 + prev.docs.length) % prev.docs.length,
              }
            : null
        )
      } else if (e.key === 'ArrowRight' && previewModal.docs.length > 1) {
        setPreviewModal((prev) =>
          prev
            ? {
                ...prev,
                activeIndex: (prev.activeIndex + 1) % prev.docs.length,
              }
            : null
        )
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewModal])

  useEffect(() => {
    masterApi
      .fetchCategory()
      .then((rows) => setCategories(Array.isArray(rows) ? rows : []))
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    let active = true
    setState('loading')
    historyApi
      .listMine(filters)
      .then((response) => {
        if (!active) return
        setResult(response.data || response)
        setState('ready')
      })
      .catch(() => {
        if (active) setState('error')
      })
    return () => {
      active = false
    }
  }, [filters, requestVersion])

  if (state === 'loading')
    return (
      <section className="page">
        <PageState
          title="Menyiapkan histori"
          message="Mengambil laporan yang pernah Anda kirim."
        />
      </section>
    )
  if (state === 'error')
    return (
      <section className="page">
        <PageState
          tone="error"
          title="Histori tidak dapat dimuat"
          message="Periksa koneksi server, lalu muat kembali halaman."
          action={<button className="secondary-button" type="button" onClick={() => setRequestVersion((current) => current + 1)}>Coba lagi</button>}
        />
      </section>
    )
  const totalPages = Math.max(
    1,
    Math.ceil(result.total / (result.limit || filters.limit)),
  )

  return (
    <section className="page">
      <PageHeader
        title="Histori laporan"
        description="Semua kegiatan yang pernah Anda kirim tersimpan di sini."
        action={
          <Link className="primary-button icon-label" to="/pegawai/laporan/new">
            <Icon name="plus" />
            Buat laporan
          </Link>
        }
      />
      <section className="filter-bar" aria-label="Filter histori">
        <div className="filter-fields">
          <label>
            Tanggal
            <input
              aria-label="Tanggal histori"
              type="date"
              value={filters.tanggal}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  tanggal: event.target.value,
                  page: 1,
                }))
              }
            />
          </label>
          <label>
            Kategori
            <select
              aria-label="Kategori histori"
              value={filters.processId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  processId: event.target.value,
                  page: 1,
                }))
              }
            >
              <option value="">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {(filters.tanggal || filters.processId) && (
          <button className="text-button" type="button" onClick={() => setFilters((current) => ({ ...current, tanggal: '', processId: '', page: 1 }))}>
            Hapus filter
          </button>
        )}
      </section>
      <section className="data-section table-panel">
        <div className="section-heading">
          <div>
            <h2>Daftar laporan</h2>
            <p>{result.total} laporan tersimpan</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="employee-history-table">
            <caption className="sr-only">Histori laporan pegawai</caption>
            <thead>
              <tr>
                <th>Kegiatan & kirim</th>
                <th>Project / Cluster</th>
                <th>Pekerjaan</th>
                <th>Perangkat</th>
                <th>Keterangan</th>
                <th>File</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id}>
                  <td data-label="Tanggal">
                    {String(item.tanggal_kegiatan || item.tanggalKegiatan || '').slice(0, 10)}
                    <small className="table-subline">
                      {item.created_at || item.createdAt
                        ? new Date(item.created_at || item.createdAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </small>
                  </td>
                  <td data-label="Lokasi">
                    {item.project?.name || item.project_name || item.cluster?.desa?.namaDesa || item.desa?.namaDesa || item.rw?.desa?.namaDesa || '-'} · {item.cluster?.name || item.cluster?.clusterName || item.cluster_name || item.rw?.nomorRw || '-'}
                  </td>
                  <td data-label="Pekerjaan">
                    <strong>{item.process?.name || item.master_process?.name || item.pekerjaan?.namaPekerjaan || item.pekerjaan?.name || '-'}</strong>
                  </td>
                  <td data-label="Perangkat">{item.nomor_perangkat || item.nomorPerangkat || '-'}</td>
                  <td data-label="Keterangan" className="description-cell">{item.keterangan}</td>
                  <td data-label="Dokumentasi">
                    {(() => {
                      const docs = (item.dokumentasi || item.dokumentasi_laporan || []).filter(
                        (d) => !d.laporan_id || d.laporan_id === item.id
                      )
                      if (!docs.length) {
                        return <span className="text-muted">0 foto</span>
                      }
                      return (
                        <button
                          type="button"
                          className="attachment-quick-btn"
                          onClick={() => setPreviewModal({ report: item, docs, activeIndex: 0 })}
                          title="Buka lampiran dokumentasi"
                        >
                          <Icon name="photo" size={15} />
                          <span>{docs.length} foto</span>
                        </button>
                      )
                    })()}
                  </td>
                  <td data-label="Status">
                    <span className={`status-badge ${
                      item.status === 'APPROVED' ? 'active' :
                      item.status === 'REJECTED' ? 'rejected' : 'pending'
                    }`}>
                      {item.status === 'APPROVED' ? 'Disetujui' :
                       item.status === 'REJECTED' ? 'Ditolak' : 'Menunggu'}
                    </span>
                  </td>
                  <td data-label="Aksi">
                    <div className="table-actions">
                      <Link
                        className="table-link"
                        to={`/pegawai/laporan/${item.id}`}
                      >
                        Detail
                      </Link>
                      {item.canEdit && (
                        <Link
                          className="table-link"
                          to={`/pegawai/laporan/${item.id}/edit`}
                        >
                          Edit
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!result.items?.length && (
                <tr>
                  <td className="empty-cell" colSpan="8">
                    Belum ada laporan yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button
            className="secondary-button"
            disabled={(result.page || 1) <= 1}
            onClick={() =>
              setFilters((current) => ({ ...current, page: current.page - 1 }))
            }
          >
            Sebelumnya
          </button>
          <span>
            Halaman {result.page || 1} dari {totalPages}
          </span>
          <button
            className="secondary-button"
            disabled={(result.page || 1) >= totalPages}
            onClick={() =>
              setFilters((current) => ({ ...current, page: current.page + 1 }))
            }
          >
            Berikutnya
          </button>
        </div>
      </section>

      {previewModal && previewModal.docs.length > 0 && (() => {
        const activeDoc = previewModal.docs[previewModal.activeIndex] || previewModal.docs[0]
        const fileUrl = resolveFileUrl(activeDoc.signedUrl || activeDoc.file_url || activeDoc.storagePath)
        const isImg = isImageFile(activeDoc)
        const fileName = activeDoc.original_name || activeDoc.originalName || 'Lampiran'
        const reportTitle =
          previewModal.report.process?.name ||
          previewModal.report.master_process?.name ||
          previewModal.report.pekerjaan?.namaPekerjaan ||
          'Laporan Kegiatan'
        const reportLoc =
          previewModal.report.cluster?.name ||
          previewModal.report.cluster?.clusterName ||
          previewModal.report.cluster_name ||
          ''

        return (
          <div
            className="media-lightbox-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Lampiran Dokumentasi Laporan"
            onClick={() => setPreviewModal(null)}
          >
            <div
              className="media-lightbox-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="media-lightbox-header">
                <div className="media-lightbox-title">
                  <h3>
                    {reportTitle} {reportLoc ? `· ${reportLoc}` : ''}
                  </h3>
                  <small>
                    Berkas {previewModal.activeIndex + 1} dari {previewModal.docs.length} — {fileName}
                  </small>
                </div>
                <div className="media-lightbox-actions">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="secondary-button icon-label"
                    download={fileName}
                  >
                    <Icon name="externalLink" size={16} />
                    Buka Tab Baru
                  </a>
                  <button
                    type="button"
                    className="lightbox-close-button"
                    onClick={() => setPreviewModal(null)}
                    aria-label="Tutup pratinjau"
                  >
                    <Icon name="close" size={20} />
                  </button>
                </div>
              </div>

              <div className="media-lightbox-body">
                {isImg ? (
                  <div className="media-lightbox-img-container">
                    <img
                      src={fileUrl}
                      alt={fileName}
                    />
                  </div>
                ) : (
                  <div className="media-lightbox-doc">
                    <div className="doc-icon-huge">
                      {activeDoc.mime_type === 'application/pdf' ? '📄' :
                       activeDoc.mime_type?.includes('spreadsheet') ? '📊' :
                       activeDoc.mime_type?.includes('kmz') ? '🗺️' : '📎'}
                    </div>
                    <p>{fileName}</p>
                    <a
                      href={fileUrl}
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

              {previewModal.docs.length > 1 && (
                <div className="media-lightbox-footer">
                  <button
                    type="button"
                    className="secondary-button icon-label"
                    onClick={() =>
                      setPreviewModal((prev) => ({
                        ...prev,
                        activeIndex:
                          (prev.activeIndex - 1 + prev.docs.length) % prev.docs.length,
                      }))
                    }
                  >
                    <Icon name="chevronLeft" size={16} />
                    Sebelumnya
                  </button>
                  <span className="media-lightbox-counter">
                    {previewModal.activeIndex + 1} / {previewModal.docs.length}
                  </span>
                  <button
                    type="button"
                    className="secondary-button icon-label"
                    onClick={() =>
                      setPreviewModal((prev) => ({
                        ...prev,
                        activeIndex: (prev.activeIndex + 1) % prev.docs.length,
                      }))
                    }
                  >
                    Selanjutnya
                    <Icon name="chevronRight" size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </section>
  )
}