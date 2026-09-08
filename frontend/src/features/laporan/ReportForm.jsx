import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { http } from '../../api/http.js'
import { masterApi } from '../../api/master.js'
import { createReport } from '../../api/reports.js'
import FilePicker from './FilePicker.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import Notice from '../../components/Notice.jsx'
import Icon from '../../components/Icon.jsx'

function jakartaToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

const DRAFT_PREFIX = 'sistem-pelaporan:report-draft:v2'

function emptyReportForm() {
  return {
    tanggalKegiatan: jakartaToday(),
    projectId: '',
    clusterId: '',
    categoryId: '',
    processId: '',
    keterangan: '',
    nomorPerangkat: '',
  }
}

function hasDraftContent(form) {
  return form.tanggalKegiatan !== jakartaToday() || [
    form.projectId,
    form.clusterId,
    form.categoryId,
    form.processId,
    form.keterangan,
    form.nomorPerangkat,
  ].some((value) => value && value.trim())
}

function readDraft(key) {
  try {
    const raw = localStorage.getItem(key) || (key.includes(':v2:') ? localStorage.getItem(key.replace(':v2:', ':v1:')) : null)
    const stored = JSON.parse(raw)
    if (!stored || typeof stored !== 'object') return null
    const fallback = emptyReportForm()
    const normalized = {
      tanggalKegiatan: typeof stored.tanggalKegiatan === 'string' ? stored.tanggalKegiatan : fallback.tanggalKegiatan,
      projectId: stored.projectId || stored.desaId || '',
      clusterId: stored.clusterId || '',
      categoryId: stored.categoryId || stored.kategoriId || '',
      processId: stored.processId || stored.pekerjaanId || '',
      keterangan: typeof stored.keterangan === 'string' ? stored.keterangan : '',
      nomorPerangkat: typeof stored.nomorPerangkat === 'string' ? stored.nomorPerangkat : '',
    }
    return hasDraftContent(normalized) ? normalized : null
  } catch {
    return null
  }
}

const EMPTY_ARRAY = []

export default function ReportForm({
  user,
  villages = EMPTY_ARRAY,
  jobs: jobProp = EMPTY_ARRAY,
  categories: categoryProp = EMPTY_ARRAY,
  showLaporanStatus = false,
}) {
  const navigate = useNavigate()
  const draftKey = `${DRAFT_PREFIX}:${user?.id || 'pegawai'}`
  const [initialDraft] = useState(() => readDraft(draftKey))

  const [projects, setProjects] = useState(() => villages.map((v) => ({ id: v.id, name: v.namaDesa || v.name })))
  const [clusters, setClusters] = useState([])
  const [categories, setCategories] = useState(() => categoryProp.map((c) => ({ id: c.id, name: c.namaKategori || c.name })))
  const [processes, setProcesses] = useState(() => jobProp.map((j) => ({
    id: j.id,
    name: j.namaPekerjaan || j.name,
    kategoriId: j.kategoriId || j.categoryId,
    input_instruction: j.instruksiDokumentasi || j.input_instruction,
  })))

  const [form, setForm] = useState(() => initialDraft || emptyReportForm())
  const [draftRestored, setDraftRestored] = useState(Boolean(initialDraft))
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [laporanStatus, setLaporanStatus] = useState(null)

  useEffect(() => {
    if (!showLaporanStatus) return
    let active = true
    http
      .request('/api/pegawai/laporan-status')
      .then((res) => {
        if (active && res?.data?.clusters && Array.isArray(res.data.clusters)) {
          setLaporanStatus(res.data)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [showLaporanStatus, user])

  const prevProjectId = useRef(form.projectId)
  const prevCategoryId = useRef(form.categoryId)

  useEffect(() => {
    if (villages.length > 0) {
      setProjects(villages.map((v) => ({ id: v.id, name: v.namaDesa || v.name })))
      return
    }
    let active = true
    masterApi.fetchProject()
      .then((data) => {
        if (active) setProjects(Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []))
      })
      .catch(() => {
        if (active) setProjects([])
      })
    return () => {
      active = false
    }
  }, [villages])

  useEffect(() => {
    if (categoryProp.length > 0) {
      setCategories(categoryProp.map((c) => ({ id: c.id, name: c.namaKategori || c.name })))
      return
    }
    let active = true
    masterApi.fetchCategory()
      .then((data) => {
        if (active) setCategories(Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []))
      })
      .catch(() => {
        if (active) setCategories([])
      })
    return () => {
      active = false
    }
  }, [categoryProp])

  useEffect(() => {
    if (form.projectId) {
      let active = true
      masterApi.fetchClusterByProject(form.projectId)
        .then((data) => {
          if (active) {
            const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
            setClusters(list)
          }
        })
        .catch(() => {
          if (active) setClusters([])
        })
      return () => {
        active = false
      }
    } else {
      setClusters((current) => (current.length === 0 ? current : []))
    }
    if (prevProjectId.current !== form.projectId) {
      prevProjectId.current = form.projectId
      setForm((current) => (current.clusterId ? { ...current, clusterId: '' } : current))
    }
  }, [form.projectId])

  useEffect(() => {
    if (jobProp.length > 0) {
      const filtered = !form.categoryId
        ? []
        : jobProp
            .filter((j) => (j.kategoriId || j.categoryId || j.master_category_id) === form.categoryId)
            .map((j) => ({
              id: j.id,
              name: j.namaPekerjaan || j.name,
              kategoriId: j.kategoriId || j.categoryId,
              input_instruction: j.instruksiDokumentasi || j.input_instruction,
            }))
      setProcesses(filtered)
    } else if (form.categoryId) {
      let active = true
      masterApi.fetchProcessByCategory(form.categoryId)
        .then((data) => {
          if (active) setProcesses(Array.isArray(data) ? data : data?.data || [])
        })
        .catch(() => {
          if (active) setProcesses([])
        })
      return () => {
        active = false
      }
    } else {
      setProcesses((current) => (current.length === 0 ? current : []))
    }
    if (prevCategoryId.current !== form.categoryId) {
      prevCategoryId.current = form.categoryId
      setForm((current) => (current.processId ? { ...current, processId: '' } : current))
    }
  }, [form.categoryId, jobProp])

  useEffect(() => {
    try {
      if (hasDraftContent(form)) localStorage.setItem(draftKey, JSON.stringify(form))
      else localStorage.removeItem(draftKey)
    } catch {
      // A failed local draft must never block the report workflow.
    }
  }, [draftKey, form])

  const selectedProcess = useMemo(() => {
    const found = processes.find((p) => p.id === form.processId)
    if (found) return found
    const fromJob = jobProp.find((j) => j.id === form.processId)
    if (fromJob) {
      return {
        id: fromJob.id,
        name: fromJob.namaPekerjaan || fromJob.name,
        input_instruction: fromJob.instruksiDokumentasi || fromJob.input_instruction,
      }
    }
    return null
  }, [processes, form.processId, jobProp])

  const isSitac = useMemo(() => {
    const sitacCategory = categories.find((c) => c.id === form.categoryId)
    return (sitacCategory?.name || sitacCategory?.namaKategori || '').toLowerCase().includes('sitac')
  }, [categories, form.categoryId])

  const clearFieldError = (key) =>
    setFieldErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })

  const setField = (key, value) => {
    clearFieldError(key)
    setForm((current) => ({ ...current, [key]: value }))
  }

  function focusFirstInvalid(errors) {
    const fieldByError = {
      tanggalKegiatan: 'report-date',
      projectId: 'report-project',
      desaId: 'report-project',
      clusterId: 'report-cluster',
      categoryId: 'report-category',
      kategoriId: 'report-category',
      processId: 'report-process',
      pekerjaanId: 'report-process',
      nomorPerangkat: 'report-device',
      keterangan: 'report-description',
      dokumentasi: 'report-gallery-input',
    }
    const firstId = Object.keys(errors).map((key) => fieldByError[key]).find(Boolean)
    requestAnimationFrame(() => {
      const target = firstId ? document.getElementById(firstId) : null
      target?.focus()
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    })
  }

  function clearDraft() {
    try {
      localStorage.removeItem(draftKey)
      localStorage.removeItem(draftKey.replace(':v2:', ':v1:'))
    } catch {
      // Resetting the visible form remains useful even without storage access.
    }
    setForm(emptyReportForm())
    setFiles([])
    setFieldErrors({})
    setError('')
    setDraftRestored(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const validationErrors = {}
    if (!form.projectId) validationErrors.projectId = 'Project wajib dipilih.'
    if (!form.clusterId) validationErrors.clusterId = 'Cluster wajib dipilih.'
    if (!form.categoryId) validationErrors.categoryId = 'Kategori wajib dipilih.'
    if (!form.processId) validationErrors.processId = 'Pekerjaan wajib dipilih.'
    if (form.keterangan.trim().length < 5)
      validationErrors.keterangan = 'Keterangan minimal 5 karakter.'
    if (files.length < 1)
      validationErrors.dokumentasi = 'Minimal satu file wajib dipilih.'

    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors)
      setError('Lengkapi field yang masih bermasalah.')
      focusFirstInvalid(validationErrors)
      return
    }
    setFieldErrors({})
    setSubmitting(true)
    try {
      const result = await createReport({ ...form, files })
      try {
        localStorage.removeItem(draftKey)
        localStorage.removeItem(draftKey.replace(':v2:', ':v1:'))
      } catch {
        // Submission success must not depend on browser storage availability.
      }
      navigate(`/pegawai/laporan/${result.data.id}`)
    } catch (requestError) {
      const serverErrors = requestError.errors || {}
      setFieldErrors(serverErrors)
      setError(requestError.message || 'Laporan gagal dikirim.')
      focusFirstInvalid(serverErrors)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="page report-page">
      <PageHeader
        title="Buat laporan harian"
        description="Lengkapi informasi kegiatan dan dokumentasi pekerjaan Anda di lapangan."
      />
      {laporanStatus?.clusters?.length > 0 && (
        <section
          className="daily-status-card data-section"
          aria-label="Status Laporan Harian"
          style={{
            marginBottom: '1.5rem',
            background: 'var(--surface-color, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '0.85rem',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                📋 Status Laporan Harian (WIB: {laporanStatus.tanggal})
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary, #64748b)' }}>
                {laporanStatus.wajib_lapor
                  ? 'Akun Anda berstatus Wajib Lapor harian untuk cluster penugasan berikut:'
                  : 'Cluster yang ditugaskan kepada Anda:'}
              </p>
            </div>
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                backgroundColor: laporanStatus.clusters.every((c) => c.sudah_lapor) ? '#dcfce7' : '#fef3c7',
                color: laporanStatus.clusters.every((c) => c.sudah_lapor) ? '#166534' : '#b45309',
              }}
            >
              {laporanStatus.clusters.filter((c) => c.sudah_lapor).length} dari {laporanStatus.clusters.length} Cluster Sudah Dilaporkan
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {laporanStatus.clusters.map((c) => {
              const isSelected = form.clusterId === c.cluster_id
              return (
                <div
                  key={c.cluster_id}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                    background: isSelected ? '#f0f9ff' : '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{c.cluster_name}</strong>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          background: c.sudah_lapor ? '#dcfce7' : '#fee2e2',
                          color: c.sudah_lapor ? '#166534' : '#991b1b',
                        }}
                      >
                        {c.sudah_lapor ? `✓ Selesai (${c.laporan_status || 'Dilaporkan'})` : '⚠ Belum Lapor'}
                      </span>
                    </div>
                    {c.project_name && (
                      <small style={{ color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                        Projek: {c.project_name}
                      </small>
                    )}
                  </div>
                  {!isSelected && (
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ alignSelf: 'flex-start', fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                      onClick={() => {
                        const targetProject = projects.find((p) => p.name === c.project_name || p.id === c.project_id)
                        setForm((prev) => ({
                          ...prev,
                          projectId: targetProject?.id || prev.projectId,
                          clusterId: c.cluster_id,
                        }))
                      }}
                    >
                      Pilih Cluster Ini
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
      {draftRestored && (
        <div className="draft-notice" role="status" aria-label="Draf laporan">
          <Icon name="history" />
          <div>
            <strong>Draf sebelumnya dipulihkan</strong>
            <small>Isian teks tersimpan di perangkat ini. File perlu dipilih kembali.</small>
          </div>
          <button className="text-button" type="button" onClick={clearDraft}>Hapus draf</button>
        </div>
      )}
      <div className="report-layout">
        <form className="report-form" onSubmit={handleSubmit} noValidate>
          <div className="form-progress" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <section className="form-section">
            <div className="form-section-title">
              <span>1</span>
              <div>
                <h2>Kegiatan</h2>
                <p>Tanggal, project, cluster, kategori, dan jenis pekerjaan.</p>
              </div>
            </div>
            <div className="field-grid">
              <label htmlFor="report-date">
                Tanggal kegiatan <b aria-hidden="true">*</b>
                <input
                  id="report-date"
                  aria-label="Tanggal Kegiatan"
                  type="date"
                  value={form.tanggalKegiatan}
                  onChange={(event) =>
                    setField('tanggalKegiatan', event.target.value)
                  }
                  required
                  aria-invalid={Boolean(fieldErrors.tanggalKegiatan)}
                  aria-describedby={
                    fieldErrors.tanggalKegiatan
                      ? 'report-date-error'
                      : undefined
                  }
                />
                {fieldErrors.tanggalKegiatan && (
                  <small
                    id="report-date-error"
                    className="field-error"
                    role="alert"
                  >
                    {fieldErrors.tanggalKegiatan}
                  </small>
                )}
              </label>
            </div>

            <div className="field-grid">
              <label htmlFor="report-project">
                Desa / Project <b aria-hidden="true">*</b>
                <select
                  id="report-project"
                  aria-label="Desa / Project"
                  value={form.projectId}
                  onChange={(event) => {
                    clearFieldError('projectId')
                    clearFieldError('desaId')
                    setField('projectId', event.target.value)
                  }}
                  required
                  aria-invalid={Boolean(fieldErrors.projectId || fieldErrors.desaId)}
                  aria-describedby={(fieldErrors.projectId || fieldErrors.desaId) ? 'report-project-error' : undefined}
                >
                  <option value="">Pilih Project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name || project.namaDesa}
                    </option>
                  ))}
                </select>
                {(fieldErrors.projectId || fieldErrors.desaId) && (
                  <small id="report-project-error" className="field-error" role="alert">
                    {fieldErrors.projectId || fieldErrors.desaId}
                  </small>
                )}
              </label>

              <label htmlFor="report-cluster">
                Cluster / RW <b aria-hidden="true">*</b>
                <select
                  id="report-cluster"
                  aria-label="Cluster / RW"
                  value={form.clusterId}
                  onChange={(event) => {
                    clearFieldError('clusterId')
                    setField('clusterId', event.target.value)
                  }}
                  required
                  disabled={!form.projectId}
                  aria-invalid={Boolean(fieldErrors.clusterId)}
                  aria-describedby={fieldErrors.clusterId ? 'report-cluster-error' : undefined}
                >
                  <option value="">Pilih Cluster</option>
                  {(Array.isArray(clusters) ? clusters : []).map((cluster) => (
                    <option key={cluster.id} value={cluster.id}>
                      {cluster.name || cluster.clusterName}
                    </option>
                  ))}
                </select>
                {fieldErrors.clusterId && (
                  <small id="report-cluster-error" className="field-error" role="alert">
                    {fieldErrors.clusterId}
                  </small>
                )}
              </label>
            </div>

            <div className="field-grid">
              <label htmlFor="report-category">
                Kategori pekerjaan <b aria-hidden="true">*</b>
                <select
                  id="report-category"
                  aria-label="Kategori pekerjaan"
                  value={form.categoryId}
                  onChange={(event) => {
                    clearFieldError('categoryId')
                    clearFieldError('kategoriId')
                    setField('categoryId', event.target.value)
                  }}
                  required
                  aria-invalid={Boolean(fieldErrors.categoryId || fieldErrors.kategoriId)}
                  aria-describedby={(fieldErrors.categoryId || fieldErrors.kategoriId) ? 'report-category-error' : undefined}
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name || category.namaKategori}
                    </option>
                  ))}
                </select>
                {(fieldErrors.categoryId || fieldErrors.kategoriId) && (
                  <small id="report-category-error" className="field-error" role="alert">
                    {fieldErrors.categoryId || fieldErrors.kategoriId}
                  </small>
                )}
              </label>

              <label htmlFor="report-process">
                Pekerjaan <b aria-hidden="true">*</b>
                <select
                  id="report-process"
                  aria-label="Pekerjaan"
                  value={form.processId}
                  onChange={(event) => {
                    clearFieldError('processId')
                    clearFieldError('pekerjaanId')
                    clearFieldError('nomorPerangkat')
                    setForm((current) => ({
                      ...current,
                      processId: event.target.value,
                    }))
                  }}
                  required
                  disabled={!form.categoryId}
                  aria-invalid={Boolean(fieldErrors.processId || fieldErrors.pekerjaanId)}
                  aria-describedby={(fieldErrors.processId || fieldErrors.pekerjaanId) ? 'report-process-error' : undefined}
                >
                  <option value="">Pilih Pekerjaan</option>
                  {processes
                    .filter((p) => p.is_active !== false)
                    .map((process) => (
                      <option key={process.id} value={process.id}>
                        {process.name || process.namaPekerjaan}
                      </option>
                    ))}
                </select>
                {(fieldErrors.processId || fieldErrors.pekerjaanId) && (
                  <small id="report-process-error" className="field-error" role="alert">
                    {fieldErrors.processId || fieldErrors.pekerjaanId}
                  </small>
                )}
              </label>
            </div>

            <label htmlFor="report-device">
              Nomor perangkat <small className="optional-tag">(Opsional)</small>
              <input
                id="report-device"
                aria-label="Nomor Perangkat"
                placeholder="Opsional: ODP-001, Tiang-002, WO-003, PO-004"
                value={form.nomorPerangkat}
                onChange={(event) =>
                  setField('nomorPerangkat', event.target.value)
                }
                aria-invalid={Boolean(fieldErrors.nomorPerangkat)}
                aria-describedby={
                  fieldErrors.nomorPerangkat
                    ? 'report-device-error'
                    : undefined
                }
              />
              {fieldErrors.nomorPerangkat && (
                <small
                  id="report-device-error"
                  className="field-error"
                  role="alert"
                >
                  {fieldErrors.nomorPerangkat}
                </small>
              )}
            </label>

            {(selectedProcess?.input_instruction || selectedProcess?.instruksiDokumentasi) && (
              <div className="stage-guidance" role="status">
                <Icon name="photo" />
                <div>
                  <strong>Panduan dokumentasi untuk pekerjaan ini</strong>
                  <p>{selectedProcess.input_instruction || selectedProcess.instruksiDokumentasi}</p>
                </div>
              </div>
            )}
          </section>
          <section className="form-section">
            <div className="form-section-title">
              <span>2</span>
              <div>
                <h2>Catatan pekerjaan</h2>
                <p>Jelaskan hasil pekerjaan secara ringkas dan jelas.</p>
              </div>
            </div>
            <label htmlFor="report-description">
              Keterangan <b aria-hidden="true">*</b>
              <textarea
                className="resize-none"
                id="report-description"
                aria-label="Keterangan"
                placeholder="Contoh: Pemasangan ODP di RW 05 sebanyak 12 titik. Kondisi lokasi aman."
                value={form.keterangan}
                onChange={(event) => setField('keterangan', event.target.value)}
                maxLength="2000"
                required
                aria-invalid={Boolean(fieldErrors.keterangan)}
                aria-describedby={
                  fieldErrors.keterangan
                    ? 'report-description-error'
                    : undefined
                }
              />
              {fieldErrors.keterangan && (
                <small
                  id="report-description-error"
                  className="field-error"
                  role="alert"
                >
                  {fieldErrors.keterangan}
                </small>
              )}
            </label>
            <div className="character-count">
              {form.keterangan.length} / 2.000
            </div>
          </section>
          <section className="form-section">
            <div className="form-section-title">
              <span>3</span>
              <div>
                <h2>Dokumentasi</h2>
                <p>
                  {isSitac
                    ? 'Unggah file dokumen SITAC (PDF, KMZ, KML, Excel) atau foto.'
                    : 'Unggah 1–10 foto yang menunjukkan kegiatan dan lokasi.'}
                </p>
              </div>
            </div>
            <FilePicker
              files={files}
              onChange={(nextFiles) => {
                clearFieldError('dokumentasi')
                setFiles(nextFiles)
              }}
              acceptTypes={isSitac ? 'all' : 'image'}
            />
            {fieldErrors.dokumentasi && (
              <p className="field-error" role="alert">
                {fieldErrors.dokumentasi}
              </p>
            )}
          </section>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="form-actions">
            <button
              className="primary-button icon-label"
              type="submit"
              disabled={submitting}
            >
              <span>{submitting ? 'Mengirim...' : 'Kirim laporan'}</span>
              <Icon name="report" />
            </button>
          </div>
        </form>
        <aside className="submission-checklist">
          <h2>Sebelum mengirim</h2>
          <ul>
            <li>
              <Icon name="check" />
              <span>Pastikan tanggal, project, dan cluster sudah benar.</span>
            </li>
            <li>
              <Icon name="check" />
              <span>Pilih kategori dan pekerjaan yang sesuai.</span>
            </li>
            <li>
              <Icon name="check" />
              <span>Tulis hasil pekerjaan yang dapat dipahami tim.</span>
            </li>
            <li>
              <Icon name="check" />
              <span>
                {isSitac
                  ? 'Pilih file dokumen atau foto yang jelas.'
                  : 'Pilih foto yang jelas dan sesuai kegiatan.'}
              </span>
            </li>
          </ul>
        </aside>
      </div>
    </section>
  )
}