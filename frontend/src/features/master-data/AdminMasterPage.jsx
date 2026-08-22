import { useCallback, useEffect, useMemo, useState } from 'react'
import { masterApi } from '../../api/master.js'
import MasterTable from './MasterTable.jsx'
import StageFields from './StageFields.jsx'

const emptyForms = {
  desa: { namaDesa: '' },
  rw: { desaId: '', nomorRw: '' },
  tahapan: { namaTahapan: '', requiresNomorPerangkat: false, instruksiDokumentasi: '' },
}

const labels = { desa: 'Desa', rw: 'RW', tahapan: 'Tahapan' }

export default function AdminMasterPage() {
  const [data, setData] = useState({ desa: [], rw: [], tahapan: [] })
  const [editor, setEditor] = useState(null)
  const [form, setForm] = useState(emptyForms.desa)
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setState('loading')
    try {
      const [desa, rw, tahapan] = await Promise.all(['desa', 'rw', 'tahapan'].map(masterApi.fetchAdmin))
      setData({ desa, rw, tahapan })
      setState('ready')
    } catch (requestError) {
      setError(requestError.message || 'Master data tidak dapat dimuat.')
      setState('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const desaNames = useMemo(() => Object.fromEntries(data.desa.map((item) => [item.id, item.namaDesa])), [data.desa])

  function openCreate(resource) {
    setEditor({ resource, id: null })
    setForm({ ...emptyForms[resource] })
    setError('')
    setMessage('')
  }

  function openEdit(resource, row) {
    setEditor({ resource, id: row.id })
    if (resource === 'desa') setForm({ namaDesa: row.namaDesa })
    if (resource === 'rw') setForm({ desaId: row.desaId, nomorRw: row.nomorRw })
    if (resource === 'tahapan') setForm({ namaTahapan: row.namaTahapan, requiresNomorPerangkat: row.requiresNomorPerangkat, instruksiDokumentasi: row.instruksiDokumentasi || '' })
    setError('')
    setMessage('')
  }

  async function save(event) {
    event.preventDefault()
    setState('saving')
    setError('')
    try {
      const payload = editor.resource === 'tahapan' ? { ...form, instruksiDokumentasi: form.instruksiDokumentasi.trim() || null } : form
      if (editor.id) await masterApi.update(editor.resource, editor.id, payload)
      else await masterApi.create(editor.resource, payload)
      setMessage(`${labels[editor.resource]} berhasil ${editor.id ? 'diperbarui' : 'ditambahkan'}.`)
      setEditor(null)
      await load()
    } catch (requestError) {
      setError(requestError.message || 'Perubahan gagal disimpan.')
      setState('ready')
    }
  }

  async function toggle(resource, row) {
    setError('')
    setMessage('')
    try {
      await masterApi.setActive(resource, row.id, !row.isActive)
      setMessage(`${labels[resource]} berhasil ${row.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`)
      await load()
    } catch (requestError) {
      setError(requestError.message || 'Status gagal diperbarui.')
    }
  }

  return <section className="page">
    <div className="page-heading"><div><p className="eyebrow">Pengaturan sistem</p><h1>Master Data</h1><p>Kelola pilihan Desa, RW, dan Tahapan yang digunakan pada formulir laporan.</p></div></div>
    {message && <p className="notice success" role="status">{message}</p>}
    {error && <p className="notice error" role="alert">{error}</p>}
    {editor && <form className="editor-card panel" onSubmit={save}>
      <div className="table-heading"><div><p className="eyebrow">{editor.id ? 'Edit data' : 'Data baru'}</p><h2>{labels[editor.resource]}</h2></div><button className="text-button" type="button" onClick={() => setEditor(null)}>Batal</button></div>
      {editor.resource === 'desa' && <label>Nama Desa<input aria-label="Nama Desa" value={form.namaDesa} onChange={(event) => setForm({ namaDesa: event.target.value })} required /></label>}
      {editor.resource === 'rw' && <div className="field-grid"><label>Desa<select aria-label="Desa RW" value={form.desaId} onChange={(event) => setForm({ ...form, desaId: event.target.value })} required><option value="">Pilih Desa</option>{data.desa.filter((item) => item.isActive || item.id === form.desaId).map((item) => <option key={item.id} value={item.id}>{item.namaDesa}</option>)}</select></label><label>Nomor RW<input aria-label="Nomor RW" placeholder="Contoh: RW 01" value={form.nomorRw} onChange={(event) => setForm({ ...form, nomorRw: event.target.value })} required /></label></div>}
      {editor.resource === 'tahapan' && <StageFields value={form} onChange={setForm} />}
      <div className="form-actions"><button className="primary-button" type="submit" disabled={state === 'saving'}>{state === 'saving' ? 'Menyimpan...' : 'Simpan'}</button></div>
    </form>}
    {state === 'loading' && data.desa.length === 0 ? <div className="panel loading-block" role="status">Memuat master data...</div> : <>
      <MasterTable title="Desa" columns={[{ key: 'namaDesa', label: 'Nama Desa' }]} rows={data.desa} onCreate={() => openCreate('desa')} onEdit={(row) => openEdit('desa', row)} onToggleActive={(row) => toggle('desa', row)} />
      <MasterTable title="RW" columns={[{ key: 'desaId', label: 'Desa', render: (row) => desaNames[row.desaId] || '-' }, { key: 'nomorRw', label: 'Nomor RW' }]} rows={data.rw} onCreate={() => openCreate('rw')} onEdit={(row) => openEdit('rw', row)} onToggleActive={(row) => toggle('rw', row)} />
      <MasterTable title="Tahapan" columns={[{ key: 'namaTahapan', label: 'Nama Tahapan' }, { key: 'requiresNomorPerangkat', label: 'Nomor Perangkat', render: (row) => row.requiresNomorPerangkat ? 'Wajib' : 'Tidak wajib' }]} rows={data.tahapan} onCreate={() => openCreate('tahapan')} onEdit={(row) => openEdit('tahapan', row)} onToggleActive={(row) => toggle('tahapan', row)} />
    </>}
  </section>
}
