import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../../api/dashboard.js'
import { masterApi } from '../../api/master.js'
import PageHeader from '../../components/PageHeader.jsx'
import PageState from '../../components/PageState.jsx'
import Icon from '../../components/Icon.jsx'

export default function DokumentasiPage() {
  const [filters, setFilters] = useState({
    desaId: '',
    pekerjaanId: '',
    search: '',
  })
  const [options, setOptions] = useState({
    villages: [],
    jobs: [],
  })
  const [data, setData] = useState({ items: [], total: 0 })
  const [state, setState] = useState('loading')

  useEffect(() => {
    Promise.all([
      masterApi.fetchDesa(),
      masterApi.fetchPekerjaan(),
    ])
      .then(([villages, jobs]) => {
        setOptions({
          villages: Array.isArray(villages) ? villages : [],
          jobs: Array.isArray(jobs) ? jobs : [],
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    setState('loading')
    dashboardApi
      .listDocumentation(filters)
      .then((res) => {
        if (active) {
          setData(res.data)
          setState('ready')
        }
      })
      .catch(() => {
        if (active) setState('error')
      })
    return () => {
      active = false
    }
  }, [filters])

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const resetFilters = () => {
    setFilters({ desaId: '', pekerjaanId: '', search: '' })
  }

  const hasFilters = Boolean(filters.desaId || filters.pekerjaanId || filters.search)

  // Group photos by Hierarchy: Cluster (Cluster / Desa) -> Pekerjaan -> Foto
  const groupedByCluster = data.items.reduce((acc, item) => {
    const clusterTitle = item.cluster
      ? `${item.cluster.desa?.namaDesa || 'Desa'} - ${item.cluster.clusterName}`
      : (item.desa?.namaDesa || 'Tanpa Cluster')
    const pekerjaanName = item.pekerjaan?.namaPekerjaan || 'Tanpa Pekerjaan'

    if (!acc[clusterTitle]) {
      acc[clusterTitle] = {}
    }
    if (!acc[clusterTitle][pekerjaanName]) {
      acc[clusterTitle][pekerjaanName] = []
    }
    acc[clusterTitle][pekerjaanName].push(item)
    return acc
  }, {})

  const handlePrint = () => {
    window.print()
  }

  return (
    <section className="page documentation-page">
      <PageHeader
        title="Dokumentasi Kegiatan"
        description="Galeri dokumentasi foto kegiatan proyek berdasarkan hirarki Cluster dan Pekerjaan."
        action={
          <button className="secondary-button icon-label no-print" onClick={handlePrint}>
            <Icon name="download" />
            Cetak / Simpan PDF
          </button>
        }
      />

      <section className="filter-bar no-print" aria-label="Filter dokumentasi">
        <div className="filter-fields">
          <label htmlFor="filter-doc-search">
            Cari Keterangan / PIC
            <input
              id="filter-doc-search"
              type="text"
              placeholder="Cari..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </label>
          <label htmlFor="filter-doc-desa">
            Cluster / Desa
            <select
              id="filter-doc-desa"
              aria-label="Cluster / Desa"
              value={filters.desaId}
              onChange={(e) => updateFilter('desaId', e.target.value)}
            >
              <option value="">Semua Cluster / Desa</option>
              {options.villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.namaDesa}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="filter-doc-pekerjaan">
            Pekerjaan
            <select
              id="filter-doc-pekerjaan"
              aria-label="Pekerjaan"
              value={filters.pekerjaanId}
              onChange={(e) => updateFilter('pekerjaanId', e.target.value)}
            >
              <option value="">Semua Pekerjaan</option>
              {options.jobs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.namaPekerjaan}
                </option>
              ))}
            </select>
          </label>
        </div>
        {hasFilters && (
          <button className="text-button" type="button" onClick={resetFilters}>
            Hapus filter
          </button>
        )}
      </section>

      {state === 'loading' && (
        <PageState
          title="Menyiapkan dokumentasi"
          message="Mengambil data foto dari laporan kegiatan."
        />
      )}

      {state === 'error' && (
        <PageState
          tone="error"
          title="Gagal memuat dokumentasi"
          message="Terjadi kesalahan saat mengambil foto dokumentasi."
        />
      )}

      {state === 'ready' && data.items.length === 0 && (
        <PageState
          title="Tidak ada dokumentasi"
          message={
            hasFilters
              ? 'Tidak ditemukan foto yang sesuai dengan filter yang dipilih.'
              : 'Belum ada foto dokumentasi yang diunggah pada sistem.'
          }
        />
      )}

      {state === 'ready' && data.items.length > 0 && (
        <div className="documentation-container printable-area">
          {Object.entries(groupedByCluster).map(([clusterTitle, pekerjaanMap]) => (
            <div key={clusterTitle} className="desa-group-card data-section">
              <div className="section-heading desa-heading">
                <div>
                  <h2>Cluster: {clusterTitle}</h2>
                  <p>
                    {Object.values(pekerjaanMap).reduce((sum, list) => sum + list.length, 0)} foto terdaftar
                  </p>
                </div>
              </div>

              <div className="tahapan-group-list">
                {Object.entries(pekerjaanMap).map(([pekerjaanName, photos]) => (
                  <div key={pekerjaanName} className="tahapan-subcard">
                    <h3 className="tahapan-subheading">Pekerjaan: {pekerjaanName}</h3>
                    <div className="photo-grid">
                      {photos.map((item) => (
                        <div key={item.id} className="photo-card">
                          <div className="photo-wrap">
                            <img src={item.signedUrl || item.storagePath} alt={item.originalName || 'Foto dokumentasi'} />
                          </div>
                          <div className="photo-meta">
                            <div className="photo-badges">
                              <span className="badge-tag village-tag">
                                {item.cluster?.desa?.namaDesa || item.desa?.namaDesa || 'Desa'} · {item.cluster?.clusterName || 'Cluster'}
                              </span>
                              <span className="badge-tag stage-tag">{item.pekerjaan?.namaPekerjaan}</span>
                            </div>
                            <p className="photo-pic">
                              <strong>PIC:</strong> {item.pegawai?.nama || '-'} {item.pegawai?.nomorHp ? `(${item.pegawai.nomorHp})` : ''}
                            </p>
                            <p className="photo-date">
                              <strong>Tanggal:</strong> {String(item.tanggalKegiatan || '').slice(0, 10)}
                            </p>
                            {item.keterangan && (
                              <p className="photo-caption" title={item.keterangan}>
                                {item.keterangan}
                              </p>
                            )}
                            <Link
                              to={`/admin/laporan/${item.laporanId}`}
                              className="table-link photo-detail-link no-print"
                            >
                              Lihat detail laporan <Icon name="chevronRight" size={14} />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
