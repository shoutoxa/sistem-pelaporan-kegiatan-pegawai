import { useEffect, useState } from "react";
import { masterApi } from "../../api/master.js";

export default function LocationFields({
  value,
  onChange,
  errors = {},
  desaOptions: desaProp,
}) {
  const [fetchedDesaOptions, setFetchedDesaOptions] = useState([]);
  const [rwOptions, setRwOptions] = useState([]);
  const [loadingRw, setLoadingRw] = useState(false);
  const desaOptions = desaProp || fetchedDesaOptions;
  const selectedDesa = value.desaId || "";

  useEffect(() => {
    if (desaProp) return;
    masterApi
      .fetchDesa()
      .then(setFetchedDesaOptions)
      .catch(() => setFetchedDesaOptions([]));
  }, [desaProp]);

  useEffect(() => {
    if (selectedDesa) loadRw(selectedDesa);
    // Initial value is used by the edit form; later changes load in the handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRw(desaId) {
    if (!desaId) {
      setRwOptions([]);
      return;
    }
    setLoadingRw(true);
    try {
      const rows = await masterApi.fetchRwByDesa(desaId);
      setRwOptions(Array.isArray(rows) ? rows : []);
    } catch {
      setRwOptions([]);
    } finally {
      setLoadingRw(false);
    }
  }

  async function handleDesaChange(event) {
    const desaId = event.target.value;
    setRwOptions([]);
    onChange({ desaId, rwId: "" });
    await loadRw(desaId);
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
          aria-describedby={errors.desaId ? "report-village-error" : undefined}
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
      <label htmlFor="report-rw">
        RW <b aria-hidden="true">*</b>
        <select
          id="report-rw"
          aria-label="RW"
          value={value.rwId || ""}
          disabled={!selectedDesa || loadingRw}
          onChange={(event) =>
            onChange({ desaId: selectedDesa, rwId: event.target.value })
          }
          required
          aria-invalid={Boolean(errors.rwId)}
          aria-describedby={errors.rwId ? "report-rw-error" : undefined}
        >
          <option value="">
            {loadingRw
              ? "Memuat RW..."
              : selectedDesa
                ? "Pilih RW"
                : "Pilih Desa lebih dahulu"}
          </option>
          {rwOptions
            .filter((row) => row.isActive !== false)
            .map((row) => (
              <option key={row.id} value={row.id}>
                {row.nomorRw}
              </option>
            ))}
        </select>
        {errors.rwId && (
          <small id="report-rw-error" className="field-error" role="alert">
            {errors.rwId}
          </small>
        )}
      </label>
    </div>
  );
}
