import { useEffect, useState } from 'react'
import { masterApi } from '../../api/master.js'

export default function LocationFields({
  value,
  onChange,
  errors = {},
  desaOptions: desaProp,
}) {
  const [fetchedDesaOptions, setFetchedDesaOptions] = useState([])
  const [clusterOptions, setClusterOptions] = useState([])
  const [loadingCluster, setLoadingCluster] = useState(false)
  const desaOptions = desaProp || fetchedDesaOptions
  const selectedDesa = value.desaId || ''

  useEffect(() => {
    if (desaProp) return
    masterApi
      .fetchDesa()
      .then(setFetchedDesaOptions)
      .catch(() => setFetchedDesaOptions([]))
  }, [desaProp])

  useEffect(() => {
    if (selectedDesa) loadCluster(selectedDesa)
    // Initial value is used by the edit form; later changes load in the handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadCluster(desaId) {
    if (!desaId) {
      setClusterOptions([])
      return
    }
    setLoadingCluster(true)
    try {
      const rows = await masterApi.fetchClusterByDesa(desaId)
      setClusterOptions(Array.isArray(rows) ? rows : [])
    } catch {
      setClusterOptions([])
    } finally {
      setLoadingCluster(false)
    }
  }

  async function handleDesaChange(event) {
    const desaId = event.target.value
    setClusterOptions([])
    onChange({ desaId, clusterId: '' })
    await loadCluster(desaId)
  }

  return (
    <div className="field-grid">
      <label htmlFor="report-village">
        Desa <b aria-hidden="true">*</b>
        <select
          id="report-village"
          aria-label="Desa"
          value={selectedDesa}
          onChange={handleDesaChange}
          required
          aria-invalid={Boolean(errors.desaId)}
          aria-describedby={errors.desaId ? 'report-village-error' : undefined}
        >
          <option value="">Pilih Desa</option>
          {desaOptions
            .filter((row) => row.isActive !== false)
            .map((row) => (
              <option key={row.id} value={row.id}>
                {row.namaDesa}
              </option>
            ))}
        </select>
        {errors.desaId && (
          <small id="report-village-error" className="field-error" role="alert">
            {errors.desaId}
          </small>
        )}
      </label>
      <label htmlFor="report-cluster">
        RW <b aria-hidden="true">*</b>
        <select
          id="report-cluster"
          aria-label="RW"
          value={value.clusterId || ''}
          disabled={!selectedDesa || loadingCluster}
          onChange={(event) =>
            onChange({ desaId: selectedDesa, clusterId: event.target.value })
          }
          required
          aria-invalid={Boolean(errors.clusterId)}
          aria-describedby={errors.clusterId ? 'report-cluster-error' : undefined}
        >
          <option value="">
            {loadingCluster
              ? 'Memuat Cluster...'
              : selectedDesa
                ? 'Pilih RW'
                : 'Pilih Desa lebih dahulu'}
          </option>
          {clusterOptions
            .filter((row) => row.isActive !== false)
            .map((row) => (
              <option key={row.id} value={row.id}>
                {row.clusterName}
              </option>
            ))}
        </select>
        {errors.clusterId && (
          <small id="report-cluster-error" className="field-error" role="alert">
            {errors.clusterId}
          </small>
        )}
      </label>
    </div>
  )
}
