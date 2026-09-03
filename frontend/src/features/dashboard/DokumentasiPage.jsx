import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../../api/dashboard.js'
import { masterApi } from '../../api/master.js'
import PageHeader from '../../components/PageHeader.jsx'
import PageState from '../../components/PageState.jsx'
import Icon from '../../components/Icon.jsx'

const emptyFilters = { desaId: '', clusterId: '', pekerjaanId: '' }
const photosPerPage = 6

export default function DokumentasiPage() {
  const [data, setData] = useState({ items: [], total: 0 })
  const [state, setState] = useState('loading')
  const [filters, setFilters] = useState(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters)
  const [desaOptions, setDesaOptions] = useState([])
  const [clusterOptions, setClusterOptions] = useState([])
  const [pekerjaanOptions, setPekerjaanOptions] = useState([])
  const [loadingCluster, setLoadingCluster] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([masterApi.fetchDesa(), masterApi.fetchPekerjaan()])
      .then(([desa, pekerjaan]) => {
        if (!active) return
        setDesaOptions(Array.isArray(desa) ? desa : [])
        setPekerjaanOptions(Array.isArray(pekerjaan) ? pekerjaan : [])
      })
      .catch(() => {
        if (!active) return
        setDesaOptions([])
        setPekerjaanOptions([])
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setState('loading')
    dashboardApi
      .listDocumentation(appliedFilters)
      .then((response) => {
        if (!active) return
        setData(response.data)
        setState('ready')
      })
      .catch(() => {
        if (active) setState('error')
      })
    return () => { active = false }
  }, [appliedFilters])

  async function handleDesaChange(event) {
    const desaId = event.target.value
    setFilters((current) => ({ ...current, desaId, clusterId: '' }))
    setClusterOptions([])
    if (!desaId) return

    setLoadingCluster(true)
    try {
      const rows = await masterApi.fetchClusterByDesa(desaId)
      setClusterOptions(Array.isArray(rows) ? rows : [])
    } catch {
      setClusterOptions([])
    } finally {
      setLoadingCluster(false)
    }
  }

  function applyFilters(event) {
    event.preventDefault()
    setAppliedFilters({ ...filters })
  }

  function resetFilters() {
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setClusterOptions([])
  }

  const documentPages = useMemo(() => {
    const groups = new Map()

    for (const item of data.items) {
      const desaName = item.cluster?.desa?.namaDesa || item.desa?.namaDesa || 'Tanpa Desa'
      const clusterName = item.cluster?.clusterName || 'Tanpa RW'
      const pekerjaanName = item.pekerjaan?.namaPekerjaan || 'Tanpa Pekerjaan'
      const key = `${desaName}|${clusterName}|${pekerjaanName}`
      if (!groups.has(key)) groups.set(key, { desaName, clusterName, pekerjaanName, photos: [] })
      groups.get(key).photos.push(item)
    }

    return [...groups.values()].flatMap((group) => {
      const pages = []
      for (let index = 0; index < group.photos.length; index += photosPerPage) {
        pages.push({
          ...group,
          photos: group.photos.slice(index, index + photosPerPage),
          part: Math.floor(index / photosPerPage) + 1,
          totalParts: Math.ceil(group.photos.length / photosPerPage),
        })
      }
      return pages
    })
  }, [data.items])

  const selectedNames = useMemo(() => ({
    desa: desaOptions.find((item) => item.id === appliedFilters.desaId)?.namaDesa || 'Semua Desa',
    cluster: clusterOptions.find((item) => item.id === appliedFilters.clusterId)?.clusterName || 'Semua RW',
    pekerjaan: pekerjaanOptions.find((item) => item.id === appliedFilters.pekerjaanId)?.namaPekerjaan || 'Semua Pekerjaan',
  }), [appliedFilters, clusterOptions, desaOptions, pekerjaanOptions])

  return (
    <section className="page documentation-page">
      <PageHeader
        title="Dokumentasi Kegiatan"
        description="Pilih lokasi dan pekerjaan, periksa preview, lalu cetak atau simpan sebagai PDF."
      />

      <section className="data-section documentation-filter-card no-print">
        <div className="section-heading">
          <div>
            <h2>Filter dokumentasi</h2>
            <p>Gunakan satu atau beberapa pilihan untuk mempersempit hasil dokumentasi.</p>
          </div>
        </div>
        <form className="documentation-filters" onSubmit={applyFilters}>
          <label htmlFor="documentation-desa">
            Desa
            <select id="documentation-desa" value={filters.desaId} onChange={handleDesaChange}>
              <option value="">Semua Desa</option>
              {desaOptions.filter((item) => item.isActive !== false).map((item) => (
                <option key={item.id} value={item.id}>{item.namaDesa}</option>
              ))}
            </select>
          </label>
          <label htmlFor="documentation-cluster">
            RW / Cluster
            <select
              id="documentation-cluster"
              value={filters.clusterId}
              disabled={!filters.desaId || loadingCluster}
              onChange={(event) => setFilters((current) => ({ ...current, clusterId: event.target.value }))}
            >
              <option value="">
                {loadingCluster ? 'Memuat RW...' : filters.desaId ? 'Semua RW' : 'Pilih Desa terlebih dahulu'}
              </option>
              {clusterOptions.filter((item) => item.isActive !== false).map((item) => (
                <option key={item.id} value={item.id}>{item.clusterName}</option>
              ))}
            </select>
          </label>
          <label htmlFor="documentation-pekerjaan">
            Pekerjaan
            <select
              id="documentation-pekerjaan"
              value={filters.pekerjaanId}
              onChange={(event) => setFilters((current) => ({ ...current, pekerjaanId: event.target.value }))}
            >
              <option value="">Semua Pekerjaan</option>
              {pekerjaanOptions.filter((item) => item.isActive !== false).map((item) => (
                <option key={item.id} value={item.id}>{item.namaPekerjaan}</option>
              ))}
            </select>
          </label>
          <div className="documentation-filter-actions">
            <button className="primary-button icon-label" type="submit" disabled={state === 'loading'}>
              <Icon name="search" />
              Tampilkan
            </button>
            <button className="secondary-button" type="button" onClick={resetFilters} disabled={state === 'loading'}>
              Reset
            </button>
          </div>
        </form>
      </section>

      {state === 'loading' && (
        <PageState title="Menyiapkan dokumentasi" message="Mengambil foto sesuai filter yang dipilih." />
      )}

      {state === 'error' && (
        <PageState tone="error" title="Gagal memuat dokumentasi" message="Periksa koneksi server, lalu coba kembali." />
      )}

      {state === 'ready' && (
        <section className="documentation-preview-panel">
          <div className="preview-toolbar no-print">
            <div>
              <span className="preview-eyebrow">Preview dokumen</span>
              <h2>{selectedNames.desa} · {selectedNames.cluster}</h2>
              <p>{selectedNames.pekerjaan} · {data.total} foto · {documentPages.length} halaman</p>
            </div>
            <button
              className="primary-button icon-label"
              type="button"
              disabled={documentPages.length === 0}
              onClick={() => window.print()}
            >
              <Icon name="download" />
              Cetak / Simpan PDF
            </button>
          </div>

          {documentPages.length === 0 ? (
            <PageState
              title="Dokumentasi tidak ditemukan"
              message="Belum ada foto untuk kombinasi Desa, RW, dan Pekerjaan yang dipilih."
            />
          ) : (
            <div className="pdf-preview-stage printable-area">
              {documentPages.map((documentPage, pageIndex) => (
                <article
                  key={`${documentPage.desaName}-${documentPage.clusterName}-${documentPage.pekerjaanName}-${documentPage.part}`}
                  className="documentation-sheet"
                >
                  <header className="documentation-sheet-header">
                    <div className="document-brand">
                      <span aria-hidden="true">SP</span>
                      <div><strong>Sistem Pelaporan</strong><small>Kegiatan Pegawai</small></div>
                    </div>
                    <strong className="document-type">PHOTO DOCUMENTATION</strong>
                  </header>
                  <dl className="document-information">
                    <div><dt>Lokasi</dt><dd>{documentPage.desaName} · {documentPage.clusterName}</dd></div>
                    <div><dt>Pekerjaan</dt><dd>{documentPage.pekerjaanName}</dd></div>
                  </dl>
                  <div className="document-photo-grid">
                    {documentPage.photos.map((item) => (
                      <figure key={item.id} className="document-photo-item">
                        <figcaption>{item.originalName || documentPage.pekerjaanName}</figcaption>
                        <div className="document-photo-frame">
                          <img
                            src={item.signedUrl || item.storagePath}
                            alt={`${documentPage.pekerjaanName} di ${documentPage.desaName} ${documentPage.clusterName}`}
                          />
                        </div>
                        <div className="document-photo-meta">
                          <span>{String(item.tanggalKegiatan || '').slice(0, 10)}</span>
                          {item.keterangan && <p>{item.keterangan}</p>}
                          <Link className="table-link no-print" to={`/admin/laporan/${item.laporanId}`}>
                            Detail laporan <Icon name="chevronRight" size={14} />
                          </Link>
                        </div>
                      </figure>
                    ))}
                  </div>
                  <footer>
                    <span>{documentPage.totalParts > 1 ? `${documentPage.pekerjaanName} (${documentPage.part}/${documentPage.totalParts})` : documentPage.pekerjaanName}</span>
                    <span>Halaman {pageIndex + 1} dari {documentPages.length}</span>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  )
}
