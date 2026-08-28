import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { masterApi } from '../../api/master.js'
import { createReport } from '../../api/reports.js'
import LocationFields from '../master-data/LocationFields.jsx'
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

const DRAFT_PREFIX = 'sistem-pelaporan:report-draft:v1'

function emptyReportForm() {
  return {
    tanggalKegiatan: jakartaToday(),
    desaId: '',
    clusterId: '',
    pekerjaanId: '',
    keterangan: '',
    nomorPerangkat: '',
  }
}

function hasDraftContent(form) {
  return form.tanggalKegiatan !== jakartaToday() || [
    form.desaId,
    form.clusterId,
    form.pekerjaanId,
    form.keterangan,
    form.nomorPerangkat,
  ].some((value) => value.trim())
}

function readDraft(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key))
    if (!stored || typeof stored !== 'object') return null
    const fallback = emptyReportForm()
    const normalized = Object.fromEntries(
      Object.keys(fallback).map((field) => [
        field,
        typeof stored[field] === 'string' ? stored[field] : fallback[field],
      ]),
    )
    return hasDraftContent(normalized) ? normalized : null
  } catch {
    return null
  }
}

export default function ReportForm({ user, villages, jobs: jobProp }) {
  const navigate = useNavigate()
  const draftKey = `${DRAFT_PREFIX}:${user?.id || 'pegawai'}`
  const [initialDraft] = useState(() => readDraft(draftKey))
  const [jobs, setJobs] = useState(jobProp || [])
  const [form, setForm] = useState(() => initialDraft || emptyReportForm())
  const [draftRestored, setDraftRestored] = useState(Boolean(initialDraft))
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!jobProp)
      masterApi
        .fetchPekerjaan()
        .then(setJobs)
        .catch(() => setJobs([]))
  }, [jobProp])

  useEffect(() => {
    try {
      if (hasDraftContent(form)) localStorage.setItem(draftKey, JSON.stringify(form))
      else localStorage.removeItem(draftKey)
    } catch {
      // A failed local draft must never block the report workflow.
    }
  }, [draftKey, form])

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === form.pekerjaanId),
    [jobs, form.pekerjaanId],
  )

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
      desaId: 'report-village',
      clusterId: 'report-cluster',
      pekerjaanId: 'report-job',
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
    if (!form.desaId) validationErrors.desaId = 'Desa wajib dipilih.'
    if (!form.clusterId) validationErrors.clusterId = 'Cluster wajib dipilih.'
    if (!form.pekerjaanId) validationErrors.pekerjaanId = 'Pekerjaan wajib dipilih.'
    if (form.keterangan.trim().length < 5)
      validationErrors.keterangan = 'Keterangan minimal 5 karakter.'
    if (files.length < 1)
      validationErrors.dokumentasi = 'Minimal satu foto wajib dipilih.'

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
      {draftRestored && (
        <div className="draft-notice" role="status" aria-label="Draf laporan">
          <Icon name="history" />
          <div>
            <strong>Draf sebelumnya dipulihkan</strong>
            <small>Isian teks tersimpan di perangkat ini. Foto perlu dipilih kembali.</small>
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
                <p>Tanggal, lokasi, dan jenis pekerjaan.</p>
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
            <LocationFields
              value={form}
              onChange={(location) => {
                Object.keys(location).forEach(clearFieldError)
                setForm((current) => ({ ...current, ...location }))
              }}
              desaOptions={villages}
              errors={fieldErrors}
            />
            <div className="field-grid">
              <label htmlFor="report-job">
                Pekerjaan <b aria-hidden="true">*</b>
                <select
                  id="report-job"
                  aria-label="Pekerjaan"
                  value={form.pekerjaanId}
                  onChange={(event) => {
                    clearFieldError('pekerjaanId')
                    clearFieldError('nomorPerangkat')
                    setForm((current) => ({
                      ...current,
                      pekerjaanId: event.target.value,
                    }))
                  }}
                  required
                  aria-invalid={Boolean(fieldErrors.pekerjaanId)}
                  aria-describedby={
                    fieldErrors.pekerjaanId ? 'report-job-error' : undefined
                  }
                >
                  <option value="">Pilih Pekerjaan</option>
                  {jobs
                    .filter((job) => job.isActive !== false)
                    .map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.namaPekerjaan}
                      </option>
                    ))}
                </select>
                {fieldErrors.pekerjaanId && (
                  <small
                    id="report-job-error"
                    className="field-error"
                    role="alert"
                  >
                    {fieldErrors.pekerjaanId}
                  </small>
                )}
              </label>
              <label htmlFor="report-device">
                Nomor perangkat <small className="optional-tag">(Opsional)</small>
                <input
                  id="report-device"
                  aria-label="Nomor Perangkat"
                  placeholder="Opsional / Kosongkan jika tidak ada"
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
            </div>
            {selectedJob?.instruksiDokumentasi && (
              <div className="stage-guidance" role="status">
                <Icon name="photo" />
                <div>
                  <strong>Panduan foto untuk pekerjaan ini</strong>
                  <p>{selectedJob.instruksiDokumentasi}</p>
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
                placeholder="Contoh: Penanaman tiang di Cluster 01 sebanyak 12 titik. Kondisi lokasi aman."
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
                <p>Unggah 1–5 foto yang menunjukkan kegiatan dan lokasi.</p>
              </div>
            </div>
            <FilePicker
              files={files}
              onChange={(nextFiles) => {
                clearFieldError('dokumentasi')
                setFiles(nextFiles)
              }}
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
              <span>Pastikan tanggal dan lokasi kegiatan sudah benar.</span>
            </li>
            <li>
              <Icon name="check" />
              <span>Tulis hasil pekerjaan yang dapat dipahami tim.</span>
            </li>
            <li>
              <Icon name="check" />
              <span>Pilih foto yang jelas dan sesuai kegiatan.</span>
            </li>
          </ul>
        </aside>
      </div>
    </section>
  )
}
