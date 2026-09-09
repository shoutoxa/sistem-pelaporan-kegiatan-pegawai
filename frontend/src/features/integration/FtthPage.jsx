import { useEffect, useState } from 'react'
import { ftthApi } from '../../api/ftth.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import FtthFilePicker, { fileSelectionError } from './FtthFilePicker.jsx'
import FtthReportDetailDialog from './FtthReportDetailDialog.jsx'
import ClusterReportingStatus from './ClusterReportingStatus.jsx'
import { newReportFields as empty, reportDraftKey, readReportDraft, saveReportDraft, clearReportDraft, reconcileReportFields } from './reportDraft.js'
import './ftth.css'

const labels = { PENDING: 'Menunggu', APPROVED: 'Diterima', REJECTED: 'Perlu revisi' }

export default function FtthPage({ mode = 'dev' }) {
  const { user } = useAuth()
  return <FtthPageContent key={`${reportDraftKey(user)}:${mode}`} user={user} mode={mode} />
}

function FtthPageContent({ user, mode }) {
  const isAdmin = user.role === 'SUPERADMIN'
  const showForm = mode !== 'history'
  const showHistory = mode !== 'form'
  const [references, setReferences] = useState({ projects: [], clusters: [], categories: [], processes: [] })
  const [mappings, setMappings] = useState({ users: [], pendingUploads: [] })
  const [items, setItems] = useState([])
  const [offset, setOffset] = useState(0)
  const draftKey = mode === 'form' && !isAdmin ? reportDraftKey(user) : null
  const [initialDraft] = useState(() => readReportDraft(draftKey))
  const [fields, setFields] = useState(() => initialDraft || empty())
  const [draftNotice, setDraftNotice] = useState(initialDraft ? 'Draf sebelumnya dipulihkan. Periksa tanggal dan pilih kembali berkas lampiran.' : '')
  const [draftUnavailable, setDraftUnavailable] = useState(false)
  const [statusVersion, setStatusVersion] = useState(0)
  const [files, setFiles] = useState([])
  const [fileKey, setFileKey] = useState(0)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)
  const [mapping, setMapping] = useState({ localUserId: '', externalUserId: '', allowedClusterIds: [] })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [revision, setRevision] = useState('')
  const [attempt, setAttempt] = useState(0)
  const selectedProcess = references.processes.find((p) => p.id === fields.process_id)

  useEffect(() => {
    if (draftKey && ready && !editing) setDraftUnavailable(!saveReportDraft(draftKey, fields))
  }, [draftKey, ready, editing, fields])

  function discardDraft() {
    clearReportDraft(draftKey); setFields(empty()); setFiles([]); setFileKey((x) => x + 1); setDraftNotice('Draf dihapus.')
  }

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const status = await ftthApi.status()
        if (!status.enabled) throw new Error('Mode development belum aktif. Isi FTTH_API_KEY, terapkan migration pada database development, lalu aktifkan FTTH_REPORTS_ENABLED=true di backend.')
        const refs = showForm ? await ftthApi.references() : null
        if (ignore) return
        if (refs) {
          setReferences(refs)
          setFields((current) => reconcileReportFields(current, refs))
        }
        if (isAdmin) {
          const data = await ftthApi.mappings()
          if (ignore) return
          setMappings(data)
        }
        const data = showHistory ? await ftthApi.list(0) : []
        if (!ignore) setReady(true)
        if (!ignore) setItems(data)
      } catch (e) { if (!ignore) setError(e.message) }
    }
    load()
    return () => { ignore = true }
  }, [isAdmin, showForm, showHistory, attempt])

  async function action(fn) {
    setBusy(true); setError(''); setMessage('')
    try { await fn() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function refresh(nextOffset = offset) {
    setItems(await ftthApi.list(nextOffset)); setOffset(nextOffset)
  }
  function change(name, value) {
    setFields((current) => ({ ...current, [name]: value,
      ...(name === 'project_id' ? { cluster_id: '' } : {}),
      ...(name === 'category_id' ? { process_id: '' } : {}),
    }))
  }
  async function submit(event) {
    event.preventDefault()
    await action(async () => {
      const { category_id: _category, ...data } = fields
      if (editing) {
        await ftthApi.update(editing, data)
        setMessage('Koreksi laporan tersimpan.'); setEditing(null)
      } else {
        if (!files.length || files.length > 5 || files.some((file) => file.size > 10000000)) throw new Error('Pilih 1–5 lampiran, maksimal 10 MB per berkas.')
        const problem = fileSelectionError(files)
        if (problem) throw new Error(problem)
        if (!references.clusters.some((c) => c.id === data.cluster_id && c.project_id === data.project_id)) throw new Error('Pilih cluster dari penugasan yang tersedia.')
        const body = new FormData()
        Object.entries(data).forEach(([key, value]) => body.append(key, value))
        files.forEach((file) => body.append('dokumentasi', file))
        const result = await ftthApi.create(body)
        setMessage(`Laporan ${result.id} tersimpan. ${result.warnings?.join(' ') || 'Lampiran terkirim.'}`)
        clearReportDraft(draftKey); setDraftNotice(''); setStatusVersion((x) => x + 1)
      }
      setFields(empty()); setFiles([]); setFileKey((value) => value + 1)
      if (showHistory) await refresh(0)
    })
  }
  function edit(item) {
    const process = references.processes.find((p) => p.id === item.process_id)
    setFields({ ...empty(), project_id: item.project_id, cluster_id: item.cluster_id, category_id: process?.master_category_id || '',
      process_id: item.process_id, tanggal_kegiatan: item.tanggal_kegiatan.slice(0, 10), nomor_perangkat: item.nomor_perangkat || '', keterangan: item.keterangan || '' })
    setEditing(item.id)
    document.getElementById('ftth-form-title')?.focus()
  }
  const select = (name, title, options) => <label>{title}<select aria-label={title} required disabled={(name === 'cluster_id' && !fields.project_id) || (name === 'process_id' && !fields.category_id)} value={fields[name]} onChange={(e) => change(name, e.target.value)}>
    <option value="">Pilih {title.toLowerCase()}</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
  </select></label>

  return <div className={`ftth-page ftth-mode-${mode}`}>
    <header className="ftth-page-heading"><div><h1>{mode === 'form' ? 'Buat laporan' : mode === 'history' ? 'Histori laporan' : <>Integrasi FTTH <small>Development</small></>}</h1><p>{mode === 'form' ? 'Catat pekerjaan dan lampirkan bukti kegiatan Anda.' : mode === 'history' ? 'Pantau status dan buka kembali dokumentasi kegiatan Anda.' : `${user?.authSource === 'ftth' ? 'Login FTTH' : 'Login lokal'} • Laporan dan lampiran baru di API FTTH`}</p></div>
    {mode !== 'dev' && <a className="secondary-button" href={mode === 'form' ? '/pegawai/histori' : '/pegawai/laporan/new'}>{mode === 'form' ? 'Lihat histori laporan' : 'Buat laporan baru'}</a>}</header>
    <details className="ftth-storage-info"><summary>Informasi penyimpanan</summary>
    <p className="ftth-note">Berkas baru disimpan di server FTTH. Kebijakan privasi tautan server belum terverifikasi; gunakan berkas uji tanpa informasi sensitif.</p>
    <p className="ftth-note">Sumber data: perusahaan. Laporan lama tetap tersimpan terpisah; tidak dimigrasikan atau dikirim ulang otomatis.</p>
    </details>
    {error && <p role="alert" className="ftth-error">{error}</p>}
    {!ready && (error ? <button onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Coba lagi</button> : <p role="status">Memuat data…</p>)}
    {message && <p role="status" className="ftth-note">{message}</p>}
    {ready && <>
      {isAdmin && user.identitySource === 'ftth' && mappings.pendingUploads.length > 0 && <section className="ftth-panel"><h2>Lampiran perlu diperiksa</h2><p>Periksa metadata FTTH sebelum mencoba ulang pengiriman.</p><ul>{mappings.pendingUploads.map((item) => <li key={item.id}>{item.originalName} — {item.state}<br /><code>{item.reportId} / {item.remotePath || item.storagePath}</code></li>)}</ul></section>}
      {isAdmin && user.identitySource !== 'ftth' && <section className="ftth-panel"><h2>Pemetaan akun</h2>
        <p>Gunakan ID users FTTH yang sudah disiapkan admin. Penugasan cluster pegawai mengikuti data resmi perusahaan dan dikelola di FTTH.</p>
        <form onSubmit={(e) => { e.preventDefault(); action(async () => {
          const { localUserId, ...data } = mapping
          await ftthApi.saveMapping(localUserId, data)
          setMappings(await ftthApi.mappings()); setMessage('Pemetaan akun tersimpan.')
        }) }}>
          <fieldset disabled={busy}><div className="ftth-grid">
            <label>Akun lokal<select required value={mapping.localUserId} onChange={(e) => {
              const current = mappings.users.find((item) => item.id === e.target.value)?.ftthIdentity
              setMapping({ localUserId: e.target.value, externalUserId: current?.externalUserId || '', allowedClusterIds: current?.allowedClusterIds || [] })
            }}><option value="">Pilih akun</option>{mappings.users.map((item) => <option value={item.id} key={item.id}>{item.nama} ({item.role}){item.ftthIdentity ? ' — terhubung' : ''}</option>)}</select></label>
            <label>ID user FTTH<input required value={mapping.externalUserId} placeholder="UUID dari users FTTH" onChange={(e) => setMapping({ ...mapping, externalUserId: e.target.value })} /></label>
          </div>
          <button type="submit">Simpan pemetaan</button></fieldset>
        </form>
        {mappings.pendingUploads.length > 0 && <details><summary>Periksa {mappings.pendingUploads.length} jurnal lampiran belum terkonfirmasi</summary>
          <p>Periksa metadata FTTH berdasarkan path sebelum mencoba ulang. Jangan hapus berkas karena timeout belum berarti gagal.</p>
          <ul>{mappings.pendingUploads.map((item) => <li key={item.id}>{item.originalName} — {item.state}<br /><code>{item.reportId} / {item.remotePath || item.storagePath}</code></li>)}</ul>
        </details>}
      </section>}
      {showForm && <section className="ftth-panel"><h2 id="ftth-form-title" tabIndex={-1}>{editing ? 'Koreksi laporan FTTH' : 'Data kegiatan'}</h2>
        {!isAdmin && (user.externalUserId || user.id) && <details className="ftth-assignment-disclosure"><summary>Penugasan & status pelaporan hari ini</summary><ClusterReportingStatus userId={user.externalUserId || user.id} refreshVersion={statusVersion}
          selectableClusters={references.clusters} selectedId={fields.cluster_id} disabled={busy}
          onSelect={(cluster) => setFields((current) => ({ ...current, project_id: cluster.project_id, cluster_id: cluster.id }))} /></details>}
        {draftKey && <div className="ftth-draft-notice"><p>{draftNotice || 'Isian teks disimpan otomatis di perangkat ini; lampiran tidak disimpan.'}</p>
          <button type="button" className="secondary-button" disabled={busy} onClick={discardDraft}>Hapus draf</button>
          {draftUnavailable && <p role="alert">Penyimpanan draf tidak tersedia di browser ini. Formulir tetap dapat dikirim.</p>}</div>}
        {!references.clusters.length && <p role="alert">Belum ada cluster aktif yang diizinkan. Hubungi admin untuk memeriksa pemetaan dan penugasan.</p>}
        <form onSubmit={submit} aria-busy={busy}><fieldset disabled={busy}>
        <div className="ftth-form-section"><h3><span aria-hidden="true">1</span> Lokasi kegiatan</h3><div className="ftth-grid">
          {select('project_id', 'Project', references.projects)}
          {select('cluster_id', 'Cluster', references.clusters.filter((item) => item.project_id === fields.project_id))}
        </div>{!fields.project_id && <p className="ftth-helper">Pilih project untuk melihat cluster yang tersedia.</p>}</div>
        <div className="ftth-form-section"><h3><span aria-hidden="true">2</span> Rincian pekerjaan</h3><div className="ftth-grid">
          {select('category_id', 'Kategori', references.categories)}
          {select('process_id', 'Pekerjaan', references.processes.filter((item) => item.master_category_id === fields.category_id))}
          <label>Tanggal kegiatan<input type="date" required value={fields.tanggal_kegiatan} onChange={(e) => change('tanggal_kegiatan', e.target.value)} /></label>
          <label>Nomor perangkat (opsional)<input maxLength={100} value={fields.nomor_perangkat} onChange={(e) => change('nomor_perangkat', e.target.value)} /></label>
        </div>
        {selectedProcess?.input_instruction && <aside className="ftth-job-guidance"><strong>Panduan dokumentasi pekerjaan</strong><p>{selectedProcess.input_instruction}</p></aside>}
        {selectedProcess?.allow_file === false && <p role="alert">Pekerjaan ini tidak menerima berkas. Pengiriman teks/link belum tersedia; pilih pekerjaan lain atau hubungi admin.</p>}
        <label>Keterangan<textarea aria-label="Keterangan" required minLength={5} maxLength={2000} value={fields.keterangan} onChange={(e) => change('keterangan', e.target.value)} /></label>
        </div>
        {!editing && <div className="ftth-form-section"><h3><span aria-hidden="true">3</span> Lampiran</h3>
          <FtthFilePicker key={fileKey} files={files} onChange={setFiles} disabled={busy} />
        </div>}
        <div className="ftth-actions ftth-submit"><button type="submit" disabled={!references.clusters.length || (!editing && selectedProcess?.allow_file === false)}>{busy ? 'Memproses…' : editing ? 'Simpan koreksi' : mode === 'dev' ? 'Kirim ke FTTH development' : 'Kirim laporan'}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setFields(empty()) }}>Batal koreksi</button>}</div>
        <p className="ftth-helper">Periksa kembali data sebelum mengirim.</p>
        </fieldset></form>
      </section>}
      {showHistory && <section className="ftth-panel ftth-history-panel"><div className="ftth-actions"><div><h2>{isAdmin ? 'Laporan FTTH' : 'Laporan saya'}</h2><p className="ftth-helper">{items.length} laporan pada halaman ini</p></div><button disabled={busy} onClick={() => action(() => refresh())}>Muat ulang</button></div>
        {items.length === 0 && <p>Belum ada laporan pada halaman ini.</p>}
        <div className="ftth-history-grid">{items.map((item) => <article className="ftth-report" key={item.id}>
          <div className="ftth-report-heading"><time dateTime={item.tanggal_kegiatan?.slice(0, 10)}>{item.tanggal_kegiatan?.slice(0, 10)}</time><span className={`ftth-status ftth-status-${item.status}`}>{labels[item.status] || item.status}</span></div>
          <h3>{item.process_name || 'Laporan kegiatan'}</h3><p className="ftth-report-location"><strong>{item.project_name}</strong><span>{item.cluster_name}</span></p><p className="ftth-report-description">{item.keterangan}</p>
          {isAdmin && <p className="ftth-helper">Pelapor: {item.user_name || '—'}</p>}
          {item.catatan_revisi && <p>Catatan: {item.catatan_revisi}</p>}
          <div className="ftth-actions"><button disabled={busy} onClick={() => { setSelected(item); setRevision(item.catatan_revisi || '') }}>Lihat lampiran</button>
            {isAdmin && <>
              {item.status !== 'APPROVED' && <button disabled={busy} onClick={() => edit(item)}>Koreksi</button>}
              <button disabled={busy} onClick={() => { setSelected({ ...item, dokumentasi: [] }); setRevision(item.catatan_revisi || '') }}>Atur status</button>
              <button disabled={busy} onClick={() => { if (window.confirm('Hapus laporan FTTH dan metadata lampirannya? Pemulihan berkas di server FTTH belum dijamin.')) action(async () => { const result = await ftthApi.remove(item.id); setMessage(result.message); setSelected(null); await refresh() }) }}>Hapus</button>
            </>}
          </div>
        </article>)}</div>
        <div className="ftth-actions ftth-pagination"><button disabled={busy || offset === 0} onClick={() => action(() => refresh(offset - 25))}>Sebelumnya</button><span>Halaman {offset / 25 + 1}</span><button disabled={busy || items.length < 25} onClick={() => action(() => refresh(offset + 25))}>Berikutnya</button></div>
      </section>}
      {selected && <FtthReportDetailDialog key={selected.id} report={selected} onClose={() => setSelected(null)}>
        {isAdmin && <><label>Catatan revisi (wajib saat menolak)<textarea value={revision} maxLength={2000} onChange={(e) => setRevision(e.target.value)} /></label>
          <div className="ftth-actions">{Object.entries(labels).map(([status, title]) => <button key={status} disabled={busy || (status === 'REJECTED' && !revision.trim())} onClick={() => action(async () => {
            await ftthApi.setStatus(selected.id, { status, catatan_revisi: revision }); setSelected(null); setMessage('Status laporan diperbarui.'); await refresh()
          })}>{status === 'PENDING' ? 'Buka kembali' : title}</button>)}</div></>}
      </FtthReportDetailDialog>}
    </>}
  </div>
}
