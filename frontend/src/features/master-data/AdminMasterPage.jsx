import { useCallback, useEffect, useMemo, useState } from 'react'
import { masterApi } from '../../api/master.js'
import MasterTable from './MasterTable.jsx'
import JobFields from './JobFields.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import Notice from '../../components/Notice.jsx'
import PageState from '../../components/PageState.jsx'

const emptyForms = {
  desa: { namaDesa: '' },
  cluster: { desaId: '', clusterName: '' },
  pekerjaan: {
    namaPekerjaan: '',
    instruksiDokumentasi: '',
  },
}

const labels = { desa: 'Desa', cluster: 'RW', pekerjaan: 'Pekerjaan' }

export default function AdminMasterPage() {
  const [data, setData] = useState({ desa: [], cluster: [], pekerjaan: [] })
  const [editor, setEditor] = useState(null)
  const [form, setForm] = useState(emptyForms.desa)
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setState('loading')
    try {
      const [desa, cluster, pekerjaan] = await Promise.all(
        ['desa', 'cluster', 'pekerjaan'].map(masterApi.fetchAdmin),
      )
      setData({ desa, cluster, pekerjaan })
      setState('ready')
    } catch (requestError) {
      setError(requestError.message || 'Master data tidak dapat dimuat.')
      setState('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const desaNames = useMemo(
    () => Object.fromEntries(data.desa.map((item) => [item.id, item.namaDesa])),
    [data.desa],
  )

  function openCreate(resource) {
    setEditor({ resource, id: null })
    setForm({ ...emptyForms[resource] })
    setError('')
    setMessage('')
  }

  function openEdit(resource, row) {
    setEditor({ resource, id: row.id })
    if (resource === 'desa') setForm({ namaDesa: row.namaDesa })
    if (resource === 'cluster')
      setForm({ desaId: row.desaId, clusterName: row.clusterName })
    if (resource === 'pekerjaan')
      setForm({
        namaPekerjaan: row.namaPekerjaan,
        instruksiDokumentasi: row.instruksiDokumentasi || '',
      })
    setError('')
    setMessage('')
  }

  async function save(event) {
    event.preventDefault()
    setState('saving')
    setError('')
    try {
      const payload =
        editor.resource === 'pekerjaan'
          ? {
              ...form,
              instruksiDokumentasi: form.instruksiDokumentasi.trim() || null,
            }
          : form
      if (editor.id)
        await masterApi.update(editor.resource, editor.id, payload)
      else await masterApi.create(editor.resource, payload)
      setMessage(
        `${labels[editor.resource]} berhasil ${editor.id ? 'diperbarui' : 'ditambahkan'}.`,
      )
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
      setMessage(
        `${labels[resource]} berhasil ${row.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`,
      )
      await load()
    } catch (requestError) {
      setError(requestError.message || 'Status gagal diperbarui.')
    }
  }

  return (
    <section className="page">
      <PageHeader
        title="Master Data"
        description="Kelola pilihan Desa, RW, dan Pekerjaan yang digunakan pada formulir laporan."
      />
      {message && <Notice tone="success">{message}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {editor && (
        <form className="editor-card data-section" onSubmit={save} noValidate>
          <div className="section-heading">
            <div>
              <h2>
                {editor.id
                  ? `Edit ${labels[editor.resource]}`
                  : `Tambah ${labels[editor.resource]}`}
              </h2>
              <p>Perubahan akan langsung tersedia pada formulir Pegawai.</p>
            </div>
            <button
              className="text-button"
              type="button"
              onClick={() => setEditor(null)}
            >
              Batal
            </button>
          </div>
          {editor.resource === 'desa' && (
            <label>
              Nama Desa
              <input
                aria-label="Nama Desa"
                value={form.namaDesa}
                onChange={(event) => setForm({ namaDesa: event.target.value })}
                required
              />
            </label>
          )}
          {editor.resource === 'cluster' && (
            <div className="field-grid">
              <label>
                Desa
                <select
                  aria-label="Desa Cluster"
                  value={form.desaId}
                  onChange={(event) =>
                    setForm({ ...form, desaId: event.target.value })
                  }
                  required
                >
                  <option value="">Pilih Desa</option>
                  {data.desa
                    .filter((item) => item.isActive || item.id === form.desaId)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.namaDesa}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Nama RW
                <input
                  aria-label="Nama RW"
                  placeholder="Contoh: RW 01"
                  value={form.clusterName}
                  onChange={(event) =>
                    setForm({ ...form, clusterName: event.target.value })
                  }
                  required
                />
              </label>
            </div>
          )}
          {editor.resource === 'pekerjaan' && (
            <JobFields value={form} onChange={setForm} />
          )}
          <div className="form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={state === 'saving'}
            >
              {state === 'saving' ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      )}
      {state === 'loading' && data.desa.length === 0 ? (
        <PageState
          title="Menyiapkan master data"
            message="Mengambil Desa, RW, dan Pekerjaan."
        />
      ) : (
        <div className="master-stack">
          <MasterTable
            title="Desa"
            columns={[{ key: 'namaDesa', label: 'Nama Desa' }]}
            rows={data.desa}
            onCreate={() => openCreate('desa')}
            onEdit={(row) => openEdit('desa', row)}
            onToggleActive={(row) => toggle('desa', row)}
          />
          <MasterTable
            title="RW"
            columns={[
              {
                key: 'desaId',
                label: 'Desa',
                render: (row) => desaNames[row.desaId] || row.desa?.namaDesa || '-',
              },
              { key: 'clusterName', label: 'Nama RW' },
            ]}
            rows={data.cluster}
            onCreate={() => openCreate('cluster')}
            onEdit={(row) => openEdit('cluster', row)}
            onToggleActive={(row) => toggle('cluster', row)}
          />
          <MasterTable
            title="Pekerjaan"
            columns={[
              { key: 'namaPekerjaan', label: 'Nama Pekerjaan' },
              {
                key: 'instruksiDokumentasi',
                label: 'Instruksi Dokumentasi',
                render: (row) => row.instruksiDokumentasi || '-',
              },
            ]}
            rows={data.pekerjaan}
            onCreate={() => openCreate('pekerjaan')}
            onEdit={(row) => openEdit('pekerjaan', row)}
            onToggleActive={(row) => toggle('pekerjaan', row)}
          />
        </div>
      )}
    </section>
  )
}
