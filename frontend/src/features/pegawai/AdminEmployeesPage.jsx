import { useEffect, useState } from 'react'
import { http } from '../../api/http.js'
import PageHeader from '../../components/PageHeader.jsx'
import Notice from '../../components/Notice.jsx'
import PageState from '../../components/PageState.jsx'

const emptyForm = {
  nama: '',
  username: '',
  password: '',
  nomorHp: '',
  wajibLapor: false,
  isActive: true,
}

export default function AdminEmployeesPage() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState] = useState('loading')
  const [pendingId, setPendingId] = useState('')
  const [editingId, setEditingId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [uploadingPhotoId, setUploadingPhotoId] = useState('')
  const [selectedUserClusters, setSelectedUserClusters] = useState(null)
  const [loadingClustersUser, setLoadingClustersUser] = useState(null)
  const activeCount = rows.filter((row) => row.isActive).length
  const wajibLaporCount = rows.filter((row) => row.wajibLapor).length

  const load = () => {
    setState('loading')
    return http
      .request('/api/admin/pegawai')
      .then((body) => {
        const list = Array.isArray(body.data) ? body.data : []
        setRows(list.filter((u) => u.role !== 'SUPERADMIN' && u.role !== 'administrator'))
        setState('ready')
      })
      .catch((requestError) => {
        setError(requestError.message)
        setState('error')
      })
  }
  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditingId('')
    setForm(emptyForm)
    setFieldErrors({})
    setShowPassword(false)
    setShowForm(true)
  }
  function openEdit(row) {
    setEditingId(row.id)
    setForm({
      nama: row.nama,
      username: row.username,
      password: '',
      nomorHp: row.nomorHp || '',
      wajibLapor: row.wajibLapor,
      isActive: row.isActive,
    })
    setFieldErrors({})
    setShowPassword(false)
    setShowForm(true)
  }
  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function save(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setPendingId(editingId || 'new')
    try {
      const payload = { ...form }
      if (editingId && !payload.password) delete payload.password
      await http.request(
        `/api/admin/pegawai${editingId ? `/${editingId}` : ''}`,
        { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(payload) },
      )
      setMessage(
        `Pegawai berhasil ${editingId ? 'diperbarui' : 'ditambahkan'}.`,
      )
      setShowForm(false)
      await load()
    } catch (requestError) {
      setError(requestError.message)
      setFieldErrors(requestError.errors || {})
    } finally {
      setPendingId('')
    }
  }

  async function toggle(row) {
    setError('')
    setMessage('')
    setPendingId(row.id)
    try {
      await http.request(`/api/admin/pegawai/${row.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !row.isActive }),
      })
      setMessage(
        `${row.nama} berhasil ${row.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`,
      )
      await load()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setPendingId('')
    }
  }

  async function handlePhotoUpload(row, file) {
    if (!file) return
    setError('')
    setMessage('')
    setUploadingPhotoId(row.id)
    try {
      const formData = new FormData()
      formData.append('fotoProfil', file)
      await http.request(`/api/admin/pegawai/${row.id}/foto`, {
        method: 'POST',
        body: formData,
      })
      setMessage(`Foto profil ${row.nama} berhasil diperbarui.`)
      await load()
    } catch (requestError) {
      setError(requestError.message || 'Gagal mengunggah foto profil.')
    } finally {
      setUploadingPhotoId('')
    }
  }

  async function viewUserClusters(user) {
    setLoadingClustersUser(user.id)
    try {
      const [clustersRes, statusRes] = await Promise.all([
        http.request(`/api/admin/pegawai/${user.id}/clusters`).catch(() => ({ data: [] })),
        http.request(`/api/admin/pegawai/${user.id}/laporan-status`).catch(() => ({ data: null })),
      ])
      setSelectedUserClusters({
        user,
        clusters: Array.isArray(clustersRes.data) ? clustersRes.data : [],
        status: statusRes.data,
      })
    } catch {
      setError('Gagal memuat data cluster pegawai.')
    } finally {
      setLoadingClustersUser(null)
    }
  }

  return (
    <section className="page employee-page">
      <PageHeader
        title="Pegawai"
        description="Kelola akun, foto profil, dan kewajiban pelaporan anggota tim."
        action={
          <button className="primary-button" onClick={openCreate}>
            Tambah Pegawai
          </button>
        }
      />
      {message && <Notice tone="success">{message}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      <section className="employee-summary" aria-label="Ringkasan data pegawai">
        <article>
          <span>Total pegawai</span>
          <strong>{rows.length}</strong>
          <small>akun terdaftar</small>
        </article>
        <article>
          <span>Akun aktif</span>
          <strong className="success-value">{activeCount}</strong>
          <small>siap digunakan</small>
        </article>
        <article>
          <span>Wajib lapor</span>
          <strong className="signal-value">{wajibLaporCount}</strong>
          <small>mengisi laporan harian</small>
        </article>
      </section>
      {showForm && (
        <form className="data-section employee-form" onSubmit={save} noValidate>
          <div className="section-heading">
            <div>
              <h2>{editingId ? 'Edit Pegawai' : 'Tambah Pegawai'}</h2>
              <p>
                Role akun selalu Pegawai dan tidak dapat diubah dari formulir
                ini.
              </p>
            </div>
            <button
              className="text-button"
              type="button"
              onClick={() => setShowForm(false)}
            >
              Batal
            </button>
          </div>
          <div className="field-grid">
            <label htmlFor="employee-name">
              Nama Pegawai
              <input
                id="employee-name"
                aria-label="Nama Pegawai"
                value={form.nama}
                onChange={(event) => setField('nama', event.target.value)}
                aria-invalid={Boolean(fieldErrors.nama)}
                required
              />
              {fieldErrors.nama && (
                <small className="field-error">{fieldErrors.nama}</small>
              )}
            </label>
            <label htmlFor="employee-username">
              Username
              <input
                id="employee-username"
                aria-label="Username"
                value={form.username}
                onChange={(event) => setField('username', event.target.value)}
                aria-invalid={Boolean(fieldErrors.username)}
                required
              />
              {fieldErrors.username && (
                <small className="field-error">{fieldErrors.username}</small>
              )}
            </label>
          </div>
          <div className="field-grid">
            <label htmlFor="employee-phone">
              Nomor HP
              <input
                id="employee-phone"
                aria-label="Nomor HP"
                placeholder="Contoh: 081234567890"
                value={form.nomorHp}
                onChange={(event) => setField('nomorHp', event.target.value)}
              />
            </label>
            <div className="form-field">
              <label htmlFor="employee-password">
                Password{' '}
                {editingId && <small>(kosongkan jika tidak diubah)</small>}
              </label>
              <div className="password-field">
                <input
                  id="employee-password"
                  aria-label="Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => setField('password', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.password)}
                  required={!editingId}
                />
                <button
                  type="button"
                  className="text-button"
                  aria-label={
                    showPassword ? 'Sembunyikan password' : 'Tampilkan password'
                  }
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
              {fieldErrors.password && (
                <small className="field-error">{fieldErrors.password}</small>
              )}
            </div>
          </div>
          <div className="checkbox-stack">
            <label>
              <input
                type="checkbox"
                checked={form.wajibLapor}
                onChange={(event) =>
                  setField('wajibLapor', event.target.checked)
                }
              />{' '}
              Wajib membuat laporan harian
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setField('isActive', event.target.checked)
                }
              />{' '}
              Akun aktif
            </label>
          </div>
          <button
            className="primary-button"
            disabled={pendingId === (editingId || 'new')}
            type="submit"
          >
            {pendingId === (editingId || 'new')
              ? 'Menyimpan...'
              : 'Simpan Pegawai'}
          </button>
        </form>
      )}
      {state === 'error' && rows.length === 0 ? (
        <PageState
          tone="error"
          title="Data Pegawai tidak dapat dimuat"
          message="Periksa koneksi server, lalu coba kembali."
          action={
            <button className="secondary-button" onClick={load}>
              Coba lagi
            </button>
          }
        />
      ) : (
        <section className="data-section table-panel employee-table-panel">
          <div className="section-heading">
            <div>
              <h2>Daftar Pegawai</h2>
              <p>{rows.length} akun terdaftar</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="employee-table">
              <caption className="sr-only">Daftar akun pegawai</caption>
              <thead>
                <tr>
                  <th>Foto Profil</th>
                  <th>Nama</th>
                  <th>Username</th>
                  <th>Nomor HP</th>
                  <th>Wajib Lapor</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Foto profil">
                      <div className="avatar-cell">
                        {row.fotoProfil ? (
                          <img
                            src={row.fotoProfilUrl || row.fotoProfil}
                            alt={`Foto ${row.nama}`}
                            className="avatar-img"
                          />
                        ) : (
                          <div className="avatar-placeholder">
                            {row.nama ? row.nama.charAt(0).toUpperCase() : 'P'}
                          </div>
                        )}
                        <label className="photo-upload-label">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            style={{ display: 'none' }}
                            onChange={(e) => handlePhotoUpload(row, e.target.files[0])}
                            disabled={uploadingPhotoId === row.id}
                          />
                          <span className="secondary-button photo-upload-btn">
                            {uploadingPhotoId === row.id ? 'Unggah...' : 'Ganti Foto'}
                          </span>
                        </label>
                      </div>
                    </td>
                    <td data-label="Nama">
                      <strong>{row.nama}</strong>
                    </td>
                    <td data-label="Username">
                      <code>{row.username}</code>
                    </td>
                    <td data-label="Nomor HP">{row.nomorHp || '-'}</td>
                    <td data-label="Wajib lapor">{row.wajibLapor ? 'Ya' : 'Tidak'}</td>
                    <td data-label="Status">
                      <span
                        className={`status-badge ${row.isActive ? 'active' : 'inactive'}`}
                      >
                        {row.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td data-label="Aksi">
                      <div className="table-actions">
                        <button
                          className="secondary-button"
                          disabled={loadingClustersUser === row.id}
                          onClick={() => viewUserClusters(row)}
                          title="Lihat cluster yang ditangani dan status lapor"
                        >
                          {loadingClustersUser === row.id ? 'Memuat...' : 'Cluster'}
                        </button>
                        <button
                          className="secondary-button"
                          onClick={() => openEdit(row)}
                        >
                          Edit
                        </button>
                        <button
                          className={
                            row.isActive ? 'warning-button' : 'secondary-button'
                          }
                          disabled={pendingId === row.id}
                          onClick={() => toggle(row)}
                        >
                          {pendingId === row.id
                            ? 'Memproses...'
                            : row.isActive
                              ? 'Nonaktifkan'
                              : 'Aktifkan'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {state === 'loading' && rows.length === 0 && (
                  <tr>
                    <td className="empty-cell" colSpan="7">
                      Memuat data Pegawai...
                    </td>
                  </tr>
                )}
                {state !== 'loading' && rows.length === 0 && (
                  <tr>
                    <td className="empty-cell" colSpan="7">
                      Belum ada akun pegawai. Tambahkan pegawai untuk mulai mengatur pelaporan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedUserClusters && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Cluster untuk ${selectedUserClusters.user.nama}`}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.25rem',
          }}
        >
          <div
            className="modal-card"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                  Cluster: {selectedUserClusters.user.nama}
                </h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                  @{selectedUserClusters.user.username} · Wajib Lapor: <strong>{selectedUserClusters.user.wajibLapor ? 'Ya' : 'Tidak'}</strong>
                </p>
              </div>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: '0.35rem 0.75rem' }}
                onClick={() => setSelectedUserClusters(null)}
              >
                ✕ Tutup
              </button>
            </div>

            {selectedUserClusters.status?.tanggal && (
              <div
                style={{
                  background: '#f1f5f9',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  color: '#334155',
                }}
              >
                📅 <strong>Tanggal Evaluasi (WIB):</strong> {selectedUserClusters.status.tanggal}
              </div>
            )}

            {selectedUserClusters.clusters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
                <p style={{ margin: 0 }}>Belum ada cluster yang ditugaskan ke pegawai ini sebagai PIC.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {selectedUserClusters.clusters.map((cl) => {
                  const statusItem = selectedUserClusters.status?.clusters?.find(
                    (item) => item.cluster_id === cl.id,
                  )
                  return (
                    <div
                      key={cl.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '1rem',
                        background: '#f8fafc',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{cl.name}</strong>
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                            {cl.Project?.name || cl.project?.name || 'FTTH Project'} · Status: <strong>{cl.status || 'running'}</strong>
                          </p>
                        </div>
                        {statusItem ? (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.25rem 0.6rem',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                              background: statusItem.sudah_lapor ? '#dcfce7' : '#fee2e2',
                              color: statusItem.sudah_lapor ? '#166534' : '#991b1b',
                            }}
                          >
                            {statusItem.sudah_lapor ? '✓ Sudah Lapor' : '⚠ Belum Lapor'}
                          </span>
                        ) : null}
                      </div>
                      <div
                        style={{
                          marginTop: '0.75rem',
                          paddingTop: '0.75rem',
                          borderTop: '1px solid #e2e8f0',
                          fontSize: '0.8rem',
                          color: '#64748b',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '1.25rem',
                        }}
                      >
                        <span>Target HP: <strong>{cl.homepass_target || 0}</strong></span>
                        <span>Capaian HP: <strong>{cl.homepass_achieved || 0}</strong></span>
                        <span>Progress: <strong>{cl.overall_progress || 0}%</strong></span>
                        <span>Proses: <strong>{cl.completed_processes || 0}/{cl.total_processes || 0}</strong></span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
