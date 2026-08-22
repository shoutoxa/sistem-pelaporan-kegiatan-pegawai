export default function StageFields({ value, onChange, errors = {} }) {
  return (
    <div className="field-grid">
      <label htmlFor="stage-name">
        Nama Tahapan
        <input
          id="stage-name"
          aria-label="Nama Tahapan"
          value={value.namaTahapan || ""}
          onChange={(event) =>
            onChange({ ...value, namaTahapan: event.target.value })
          }
          required
        />
      </label>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={Boolean(value.requiresNomorPerangkat)}
          onChange={(event) =>
            onChange({ ...value, requiresNomorPerangkat: event.target.checked })
          }
        />{" "}
        <span>Nomor Perangkat wajib</span>
      </label>
      <label className="full-field" htmlFor="stage-instruction">
        Instruksi dokumentasi
        <textarea
          className="resize-none"
          id="stage-instruction"
          aria-label="Instruksi dokumentasi"
          value={value.instruksiDokumentasi || ""}
          onChange={(event) =>
            onChange({ ...value, instruksiDokumentasi: event.target.value })
          }
        />
      </label>
      {errors.namaTahapan && <small role="alert">{errors.namaTahapan}</small>}
    </div>
  );
}
