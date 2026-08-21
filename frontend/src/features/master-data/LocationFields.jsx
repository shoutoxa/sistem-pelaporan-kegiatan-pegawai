import { useEffect, useState } from 'react'
import { masterApi } from '../../api/master.js'

export default function LocationFields({ value, onChange, errors = {}, desaOptions: desaProp }) {
  const [desaOptions, setDesaOptions] = useState([])
  const [rwOptions, setRwOptions] = useState([])
  const [selectedDesa, setSelectedDesa] = useState(value.desaId || '')
  const [loadingRw, setLoadingRw] = useState(false)

  useEffect(() => {
    if (desaProp) { setDesaOptions(desaProp); return }
    masterApi.fetchDesa().then(setDesaOptions).catch(() => setDesaOptions([]))
  }, [desaProp])

  async function loadRw(desaId) {
    if (!desaId) { setRwOptions([]); return }
    setLoadingRw(true)
    try { setRwOptions(await masterApi.fetchRwByDesa(desaId)) } finally { setLoadingRw(false) }
  }

  useEffect(() => {
    if (value.desaId && value.desaId !== selectedDesa) {
      setSelectedDesa(value.desaId)
      loadRw(value.desaId)
    }
  }, [value.desaId])

  async function handleDesaChange(event) {
    const desaId = event.target.value
    setSelectedDesa(desaId)
    setRwOptions([])
    onChange({ desaId, rwId: '' })
    await loadRw(desaId)
  }

  return <div className="field-grid">
    <label>Desa<select aria-label="Desa" value={selectedDesa} onChange={handleDesaChange}><option value="">Pilih Desa</option>{desaOptions.filter((row) => row.isActive !== false).map((row) => <option key={row.id} value={row.id}>{row.namaDesa}</option>)}</select>{errors.desaId && <small role="alert">{errors.desaId}</small>}</label>
    <label>RW<select aria-label="RW" value={value.rwId || ''} disabled={!selectedDesa || loadingRw} onChange={(event) => onChange({ desaId: selectedDesa, rwId: event.target.value })}><option value="">{loadingRw ? 'Memuat RW...' : 'Pilih RW'}</option>{rwOptions.filter((row) => row.isActive !== false).map((row) => <option key={row.id} value={row.id}>{row.nomorRw}</option>)}</select>{errors.rwId && <small role="alert">{errors.rwId}</small>}</label>
  </div>
}
