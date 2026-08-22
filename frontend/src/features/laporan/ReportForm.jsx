import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { masterApi } from '../../api/master.js'
import { createReport } from '../../api/reports.js'
import LocationFields from '../master-data/LocationFields.jsx'
import FilePicker from './FilePicker.jsx'

function jakartaToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) }

export default function ReportForm({ user, villages, stages: stageProp }) {
  const navigate = useNavigate()
  const [stages, setStages] = useState(stageProp || [])
  const [form, setForm] = useState({ tanggalKegiatan: jakartaToday(), desaId: '', rwId: '', tahapanId: '', keterangan: '', nomorPerangkat: '' })
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (!stageProp) masterApi.fetchTahapan().then(setStages).catch(() => setStages([])) }, [stageProp])
  const selectedStage = useMemo(() => stages.find((stage) => stage.id === form.tahapanId), [stages, form.tahapanId])
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!form.rwId || !form.tahapanId || form.keterangan.trim().length < 5 || files.length < 1 || (selectedStage?.requiresNomorPerangkat && !form.nomorPerangkat.trim())) { setError('Lengkapi semua field wajib dan minimal satu foto.'); return }
    setSubmitting(true)
    try {
      const result = await createReport({ ...form, files })
      navigate(`/pegawai/laporan/${result.data.id}`)
    } catch (requestError) { setError(requestError.message || 'Laporan gagal dikirim.') } finally { setSubmitting(false) }
  }

  return <section className="page report-page"><div className="page-heading"><div><p className="eyebrow">Pelaporan harian</p><h1>Buat Laporan Kegiatan</h1><p>Lengkapi detail kegiatan dan sertakan minimal satu foto dokumentasi.</p></div></div><form className="report-form panel" onSubmit={handleSubmit}><div className="form-section"><h2>Informasi kegiatan</h2><div className="field-grid"><label>PIC<input aria-label="PIC" value={user?.nama || ''} readOnly /></label><label>Tanggal Kegiatan<input aria-label="Tanggal Kegiatan" type="date" value={form.tanggalKegiatan} onChange={(event) => setField('tanggalKegiatan', event.target.value)} required /></label></div><LocationFields value={form} onChange={(location) => setForm((current) => ({ ...current, ...location }))} desaOptions={villages} errors={{}} /><div className="field-grid"><label>Tahapan<select aria-label="Tahapan" value={form.tahapanId} onChange={(event) => setForm((current) => ({ ...current, tahapanId: event.target.value, nomorPerangkat: '' }))} required><option value="">Pilih Tahapan</option>{stages.filter((stage) => stage.isActive !== false).map((stage) => <option key={stage.id} value={stage.id}>{stage.namaTahapan}</option>)}</select></label>{selectedStage?.requiresNomorPerangkat && <label>Nomor Perangkat<input aria-label="Nomor Perangkat" value={form.nomorPerangkat} onChange={(event) => setField('nomorPerangkat', event.target.value)} required /></label>}</div><label>Keterangan<textarea aria-label="Keterangan" placeholder="Jelaskan kegiatan yang sudah dilakukan..." value={form.keterangan} onChange={(event) => setField('keterangan', event.target.value)} required /></label></div><div className="form-section"><h2>Dokumentasi</h2><FilePicker files={files} onChange={setFiles} /></div>{error && <p className="notice error" role="alert">{error}</p>}<div className="form-actions"><button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Mengirim...' : 'Kirim Laporan'}</button></div></form></section>
}
