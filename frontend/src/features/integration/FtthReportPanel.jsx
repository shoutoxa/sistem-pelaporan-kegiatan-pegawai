import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { ftthApi } from '../../api/ftth.js'
import FtthAttachments from './FtthAttachments.jsx'
import './ftth.css'

const labels = {
  ON_PROGRESS: 'On Progress',
  SELESAI: 'Selesai',
  KENDALA: 'Kendala',
  PENDING: 'Menunggu',
  APPROVED: 'Diterima',
  REJECTED: 'Perlu revisi',
}

const actionStatuses = {
  APPROVED: 'Terima laporan',
  REJECTED: 'Perlu revisi',
  SELESAI: 'Tandai Selesai',
  ON_PROGRESS: 'Set On Progress',
  KENDALA: 'Tandai Kendala',
  PENDING: 'Buka kembali',
}

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
        nomor_perangkat: report.nomor_perangkat || '',
        status: report.status || 'ON_PROGRESS',
        kendala_lapangan: report.kendala_lapangan || report.keterangan || '',
        keterangan: report.kendala_lapangan || report.keterangan || '' })
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
      <h3>{report.status === 'KENDALA' ? 'Kendala Laporan (Lapangan)' : 'Kendala / Keterangan'}</h3>
      <p className="ftth-report-description">
        {report.status === 'KENDALA' && <strong className="text-danger" style={{ display: 'block', marginBottom: '4px' }}>Ada Kendala Lapangan: </strong>}
        {report.kendala_lapangan || report.keterangan || 'Tidak ada catatan kendala.'}
      </p>
      <h3>Lampiran</h3>
      <FtthAttachments key={report.id || id} items={report.dokumentasi || []} />
      <fieldset disabled={busy} className="ftth-verification">
        <legend>Verifikasi laporan</legend><p id="ftth-revision-help">Isi catatan jika laporan perlu revisi.</p>
        <label>Catatan revisi<textarea aria-describedby="ftth-revision-help" maxLength={2000} value={revision} onChange={(e) => setRevision(e.target.value)} /></label>
        <div className="ftth-actions">{Object.entries(actionStatuses).map(([status, title]) => <button key={status} className={status === 'APPROVED' || status === 'SELESAI' ? 'ftth-primary' : ''}
          disabled={report.status === status || (status === 'REJECTED' && !revision.trim())}
          onClick={() => action(async () => {
            await ftthApi.setStatus(id, { status, catatan_revisi: revision }); setForm(null)
            setMessage(`Status laporan diperbarui menjadi ${labels[status] || status}.`); await refresh()
          })}>{title}</button>)}</div>
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
        if (payload.status === 'KENDALA') {
          const text = (payload.kendala_lapangan || payload.keterangan || '').trim()
          if (text.length < 5) throw new Error('Kendala Lapangan wajib diisi minimal 5 karakter ketika status Kendala.')
        }
        payload.kendala_lapangan = payload.kendala_lapangan || payload.keterangan || ''
        payload.keterangan = payload.kendala_lapangan
        await ftthApi.update(id, payload); setForm(null); setMessage('Koreksi tersimpan.'); await refresh()
      }) }}><fieldset disabled={busy}><h3>Koreksi laporan</h3><div className="ftth-grid">
        {select('project_id', 'Project', refs.projects)}
        {select('cluster_id', 'Cluster', refs.clusters.filter((c) => c.project_id === form.project_id))}
        {select('category_id', 'Kategori', refs.categories)}
        {select('process_id', 'Pekerjaan', refs.processes.filter((p) => p.master_category_id === form.category_id))}
        <label>Tanggal kegiatan<input type="date" required value={form.tanggal_kegiatan} onChange={(e) => change('tanggal_kegiatan', e.target.value)} /></label>
        <label>Nomor perangkat<input maxLength={100} value={form.nomor_perangkat} onChange={(e) => change('nomor_perangkat', e.target.value)} /></label>
        <label>Status laporan
          <select value={form.status} onChange={(e) => change('status', e.target.value)}>
            <option value="ON_PROGRESS">On Progress</option>
            <option value="SELESAI">Selesai</option>
            <option value="KENDALA">Kendala</option>
            <option value="PENDING">Menunggu</option>
            <option value="APPROVED">Diterima</option>
            <option value="REJECTED">Perlu revisi</option>
          </select>
        </label>
      </div><label>Kendala Laporan / Keterangan {form.status === 'KENDALA' ? <span className="ftth-badge-required">* (Wajib diisi jika status Kendala)</span> : '(Opsional)'}<textarea required={form.status === 'KENDALA'} minLength={form.status === 'KENDALA' ? 5 : undefined} maxLength={2000} value={form.kendala_lapangan || form.keterangan || ''} onChange={(e) => { change('kendala_lapangan', e.target.value); change('keterangan', e.target.value) }} /></label>
        <button type="submit">Simpan koreksi</button><button type="button" onClick={() => setForm(null)}>Batal</button>
      </fieldset></form>}
    </>}
  </div></section>
}
