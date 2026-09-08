import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { ftthApi } from '../../api/ftth.js'
import { API_URL } from '../../api/http.js'
import './ftth.css'

const labels = { PENDING: 'Menunggu', APPROVED: 'Diterima', REJECTED: 'Perlu revisi' }
export default function FtthReportPanel({ id, onClose, onChanged }) {
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState('')
  const [form, setForm] = useState(null)
  const [refs, setRefs] = useState(null)
  const heading = useRef(null)
  useEffect(() => {
    heading.current?.focus()
    let active = true
    ftthApi.detail(id).then((data) => { if (active) { setReport(data); setRevision(data.catatan_revisi || '') } })
      .catch((e) => { if (active) setError(e.message) })
    return () => { active = false }
  }, [id])
  async function action(fn) {
    setBusy(true); setError(''); setMessage('')
    try { await fn() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function refresh() { setReport(await ftthApi.detail(id)); onChanged() }
  async function edit() {
    await action(async () => {
      const data = await ftthApi.references(); setRefs(data)
      setForm({ project_id: report.project_id, cluster_id: report.cluster_id,
        category_id: data.processes.find((p) => p.id === report.process_id)?.master_category_id || '',
        process_id: report.process_id, tanggal_kegiatan: report.tanggal_kegiatan.slice(0, 10),
        nomor_perangkat: report.nomor_perangkat || '', keterangan: report.keterangan || '' })
    })
  }
  function change(key, value) {
    setForm((current) => ({ ...current, [key]: value,
      ...(key === 'project_id' ? { cluster_id: '' } : {}), ...(key === 'category_id' ? { process_id: '' } : {}) }))
  }
  function select(key, title, items) {
    return <label>{title}<select required value={form[key]} onChange={(e) => change(key, e.target.value)}>
      <option value="">Pilih {title}</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
  }
  return <section className="ftth-page ftth-detail" aria-label="Detail laporan perusahaan"><div className="ftth-panel">
    <div className="ftth-page-heading"><h2 ref={heading} tabIndex={-1}>Detail laporan perusahaan</h2>
    <button className="secondary-button" disabled={busy} onClick={onClose}><Icon name="close" size={16} />Tutup detail</button></div>
    {error && <p role="alert" className="ftth-error">{error}</p>}
    {message && <p role="status">{message}</p>}
    {!report && !error && <p role="status">Memuat detail…</p>}
    {report && <>
      <h3 className="ftth-project-title">{report.project_name}</h3>
      <p>{report.cluster_name}</p>
      <span className={`ftth-status ftth-status-${report.status}`}>{labels[report.status] || report.status}</span>
      <dl className="ftth-metadata">
        <div><dt>Pegawai</dt><dd>{report.user_name || '—'}</dd></div>
        <div><dt>Pekerjaan</dt><dd>{report.process_name || '—'}</dd></div>
        <div><dt>Tanggal kegiatan</dt><dd>{report.tanggal_kegiatan?.slice(0, 10) || '—'}</dd></div>
        <div><dt>Nomor perangkat</dt><dd>{report.nomor_perangkat || '—'}</dd></div>
      </dl>
      <h3>Keterangan</h3><p className="ftth-report-description">{report.keterangan || 'Tidak ada keterangan.'}</p>
      <h3>Lampiran</h3>
      {!report.dokumentasi?.length && <p>Tidak ada lampiran.</p>}
      <ul className="ftth-attachments">{report.dokumentasi?.map((file) => <li key={file.id}>
        <Icon name="report" /><span className="ftth-file-name">{file.original_name}</span>
        {file.downloadUrl ? <div className="ftth-file-actions"><a href={`${API_URL}${file.downloadUrl}`} aria-label={`Buka ${file.original_name}`} target="_blank" rel="noreferrer">Buka</a>
        <a aria-label={`Unduh ${file.original_name}`} href={`${API_URL}${file.downloadUrl}?mode=download`}>Unduh</a></div> : <span>Tautan belum tersedia</span>}
      </li>)}</ul>
      <fieldset disabled={busy} className="ftth-verification">
        <legend>Verifikasi laporan</legend><p id="ftth-revision-help">Isi catatan jika laporan perlu revisi.</p>
        <label>Catatan revisi<textarea aria-describedby="ftth-revision-help" maxLength={2000} value={revision} onChange={(e) => setRevision(e.target.value)} /></label>
        <div className="ftth-actions">{Object.entries(labels).map(([status, title]) => <button key={status} className={status === 'APPROVED' ? 'ftth-primary' : ''}
          disabled={report.status === status || (status === 'REJECTED' && !revision.trim())}
          onClick={() => action(async () => {
            await ftthApi.setStatus(id, { status, catatan_revisi: revision }); setForm(null)
            setMessage('Status laporan diperbarui.'); await refresh()
          })}>{status === 'PENDING' ? 'Buka kembali' : status === 'APPROVED' ? 'Terima laporan' : title}</button>)}</div>
        {busy && <p role="status">Memproses perubahan…</p>}
        <div className="ftth-manage-actions">{report.status === 'APPROVED' ? <p>Buka kembali laporan sebelum mengoreksi.</p> : <button onClick={edit}>Koreksi laporan</button>}
        <button className="ftth-danger" onClick={() => {
          if (window.confirm('Hapus laporan perusahaan dan metadata lampirannya? Pemulihan berkas belum dijamin.')) action(async () => {
            await ftthApi.remove(id); onChanged(); onClose()
          })
        }}>Hapus laporan</button></div>
      </fieldset>
      {form && refs && <form onSubmit={(e) => { e.preventDefault(); action(async () => {
        const { category_id: _category, ...payload } = form
        await ftthApi.update(id, payload); setForm(null); setMessage('Koreksi tersimpan.'); await refresh()
      }) }}><fieldset disabled={busy}><h3>Koreksi laporan</h3><div className="ftth-grid">
        {select('project_id', 'Project', refs.projects)}
        {select('cluster_id', 'Cluster', refs.clusters.filter((c) => c.project_id === form.project_id))}
        {select('category_id', 'Kategori', refs.categories)}
        {select('process_id', 'Pekerjaan', refs.processes.filter((p) => p.master_category_id === form.category_id))}
        <label>Tanggal kegiatan<input type="date" required value={form.tanggal_kegiatan} onChange={(e) => change('tanggal_kegiatan', e.target.value)} /></label>
        <label>Nomor perangkat<input maxLength={100} value={form.nomor_perangkat} onChange={(e) => change('nomor_perangkat', e.target.value)} /></label>
      </div><label>Keterangan<textarea required minLength={5} maxLength={2000} value={form.keterangan} onChange={(e) => change('keterangan', e.target.value)} /></label>
        <button type="submit">Simpan koreksi</button><button type="button" onClick={() => setForm(null)}>Batal</button>
      </fieldset></form>}
    </>}
  </div></section>
}
