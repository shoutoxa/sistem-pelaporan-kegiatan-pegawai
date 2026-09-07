import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { historyApi } from '../../api/history.js'
import { masterApi } from '../../api/master.js'
import { updateAdminReport, updateReport } from '../../api/reports.js'
import PageHeader from '../../components/PageHeader.jsx'
import PageState from '../../components/PageState.jsx'
import Notice from '../../components/Notice.jsx'

export default function EditReportPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const isAdmin = location.pathname.startsWith('/admin')
  const [report, setReport] = useState(null)
  const [projects, setProjects] = useState([])
  const [clusters, setClusters] = useState([])
  const [categories, setCategories] = useState([])
  const [processes, setProcesses] = useState([])
  const [form, setForm] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [loadingProject, setLoadingProject] = useState(false)
  const [loadingCategory, setLoadingCategory] = useState(false)

  useEffect(() => {
    Promise.all([historyApi.getDetail(id)])
      .then(async ([detail]) => {
        const item = detail.data
        setReport(item)
        if (!item.canEdit) {
          setState(item.status === 'APPROVED' ? 'locked' : 'expired')
          return
        }

        const projectId = item.project?.id || item.project_id
        const clusterId = item.cluster?.id || item.cluster_id
        const categoryId = item.process?.master_category_id || item.master_category_id

        try {
          const [projectsData, categoriesData] = await Promise.all([
            masterApi.fetchProject(),
            masterApi.fetchCategory(),
          ])
          setProjects(Array.isArray(projectsData) ? projectsData : [])
          setCategories(Array.isArray(categoriesData) ? categoriesData : [])

          if (projectId) {
            const clustersData = await masterApi.fetchClusterByProject(projectId)
            setClusters(Array.isArray(clustersData) ? clustersData : [])
          }

          if (categoryId) {
            const processesData = await masterApi.fetchProcessByCategory(categoryId)
            setProcesses(Array.isArray(processesData) ? processesData : [])
          }
        } catch (e) {
          // Non-blocking error for metadata
        }

        setForm({
          tanggalKegiatan: String(item.tanggal_kegiatan || item.tanggalKegiatan || '').slice(0, 10),
          projectId: projectId || '',
          clusterId: clusterId || '',
          categoryId: categoryId || '',
          processId: item.process?.id || item.process_id || '',
          nomorPerangkat: item.nomor_perangkat || item.nomorPerangkat || '',
          keterangan: item.keterangan || '',
        })
        setState('ready')
      })
      .catch((requestError) => {
        setError(requestError.message)
        setState('error')
      })
  }, [id])

  async function handleProjectChange(event) {
    const projectId = event.target.value
    setForm((current) => ({ ...current, projectId, clusterId: '' }))
    setClusters([])
    if (!projectId) return

    setLoadingProject(true)
    try {
      const rows = await masterApi.fetchClusterByProject(projectId)
      setClusters(Array.isArray(rows) ? rows : [])
    } catch {
      setClusters([])
    } finally {
      setLoadingProject(false)
    }
  }

  async function handleCategoryChange(event) {
    const categoryId = event.target.value
    setForm((current) => ({ ...current, categoryId, processId: '' }))
    setProcesses([])
    if (!categoryId) return

    setLoadingCategory(true)
    try {
      const rows = await masterApi.fetchProcessByCategory(categoryId)
      setProcesses(Array.isArray(rows) ? rows : [])
    } catch {
      setProcesses([])
    } finally {
      setLoadingCategory(false)
    }
  }

  const selectedProcess = useMemo(
    () => processes.find((row) => row.id === form?.processId),
    [processes, form?.processId],
  )

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})
    try {
      const saveReport = isAdmin ? updateAdminReport : updateReport
      await saveReport(id, {
        projectId: form.projectId,
        clusterId: form.clusterId,
        processId: form.processId,
        tanggalKegiatan: form.tanggalKegiatan,
        nomorPerangkat: form.nomorPerangkat,
        keterangan: form.keterangan,
      })
      navigate(`${isAdmin ? '/admin' : '/pegawai'}/laporan/${id}`)
    } catch (requestError) {
      setError(requestError.message)
      setFieldErrors(requestError.errors || {})
    } finally {
      setSaving(false)
    }
  }

  if (state === 'loading')
    return (
      <section className="page">
        <PageState
          title="Menyiapkan laporan"
          message="Memeriksa batas waktu edit dan memuat data."
        />
      </section>
    )
  if (state === 'expired')
    return (
      <section className="page">
        <PageState
          tone="error"
          title="Batas edit sudah berakhir"
          message="Laporan hanya dapat diubah selama 24 jam setelah dikirim."
          action={
            <Link className="secondary-button" to={`${isAdmin ? '/admin' : '/pegawai'}/laporan/${id}`}>
              Kembali ke detail
            </Link>
          }
        />
      </section>
    )
  if (state === 'locked')
    return (
      <section className="page">
        <PageState
          tone="error"
          title="Laporan terkunci"
          message={isAdmin ? 'Buka kembali status persetujuan laporan sebelum mengoreksi data.' : 'Laporan sudah disetujui dan tidak dapat diubah.'}
          action={
            <Link className="secondary-button" to={`${isAdmin ? '/admin' : '/pegawai'}/laporan/${id}`}>
              Kembali ke detail
            </Link>
          }
        />
      </section>
    )
  if (state === 'error' || !form)
    return (
      <section className="page">
        <PageState
          tone="error"
          title="Laporan tidak dapat diedit"
          message={error || 'Data laporan tidak tersedia.'}
        />
      </section>
    )

  return (
    <section className="page">
      <PageHeader
        title="Edit laporan"
        description="Dokumentasi tetap tersimpan; Anda dapat memperbaiki data kegiatan selama batas 24 jam."
      />
      {error && <Notice tone="error">{error}</Notice>}
      <form className="data-section report-form edit-report-form" onSubmit={save} noValidate>
        <div className="field-grid">
          <label>
            Tanggal kegiatan
            <input
              aria-label="Tanggal kegiatan"
              type="date"
              value={form.tanggalKegiatan}
              onChange={(event) =>
                setField('tanggalKegiatan', event.target.value)
              }
            />
          </label>
        </div>

        <div className="field-grid">
          <label htmlFor="edit-project">
            Project
            <select
              id="edit-project"
              aria-label="Project"
              value={form.projectId}
              onChange={handleProjectChange}
            >
              <option value="">Pilih Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="edit-cluster">
            Cluster
            <select
              id="edit-cluster"
              aria-label="Cluster"
              value={form.clusterId}
              disabled={!form.projectId || loadingProject}
              onChange={(event) => setField('clusterId', event.target.value)}
            >
              <option value="">
                {loadingProject ? 'Memuat...' : form.projectId ? 'Pilih Cluster' : 'Pilih Project terlebih dahulu'}
              </option>
              {clusters.map((cluster) => (
                <option key={cluster.id} value={cluster.id}>
                  {cluster.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-grid">
          <label htmlFor="edit-category">
            Kategori
            <select
              id="edit-category"
              aria-label="Kategori"
              value={form.categoryId}
              onChange={handleCategoryChange}
            >
              <option value="">Pilih Kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="edit-process">
            Pekerjaan
            <select
              id="edit-process"
              aria-label="Pekerjaan"
              value={form.processId}
              disabled={!form.categoryId || loadingCategory}
              onChange={(event) => setField('processId', event.target.value)}
            >
              <option value="">
                {loadingCategory ? 'Memuat...' : form.categoryId ? 'Pilih Pekerjaan' : 'Pilih Kategori terlebih dahulu'}
              </option>
              {processes.map((process) => (
                <option key={process.id} value={process.id}>
                  {process.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Nomor perangkat <small className="optional-tag">(Opsional)</small>
          <input
            aria-label="Nomor perangkat"
            placeholder="Opsional: ODP-001, Tiang-002, WO-003, PO-004"
            value={form.nomorPerangkat}
            onChange={(event) =>
              setField('nomorPerangkat', event.target.value)
            }
          />
        </label>
        {selectedProcess?.input_instruction && (
          <div className="stage-guidance" role="status">
            <span>
              <strong>Panduan dokumentasi pekerjaan</strong>
              <p>{selectedProcess.input_instruction}</p>
            </span>
          </div>
        )}
        <label>
          Keterangan
          <textarea
            className="resize-none"
            aria-label="Keterangan"
            value={form.keterangan}
            onChange={(event) => setField('keterangan', event.target.value)}
            maxLength="2000"
          />
          {fieldErrors.keterangan && (
            <small className="field-error">{fieldErrors.keterangan}</small>
          )}
        </label>
        <p className="muted-copy">
          {(report.dokumentasi?.length || report.dokumentasi_laporan?.length || 0)} file dokumentasi tetap
          dipertahankan.
        </p>
        <div className="form-actions">
          <Link className="secondary-button" to={`${isAdmin ? '/admin' : '/pegawai'}/laporan/${id}`}>
            Batal
          </Link>
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? 'Menyimpan...' : 'Simpan perubahan'}
          </button>
        </div>
      </form>
    </section>
  )
}