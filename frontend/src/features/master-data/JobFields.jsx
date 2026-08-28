export default function JobFields({ value, onChange, errors = {} }) {
  return (
    <div className="field-grid">
      <label htmlFor="job-name">
        Nama Pekerjaan
        <input
          id="job-name"
          aria-label="Nama Pekerjaan"
          value={value.namaPekerjaan || ''}
          onChange={(event) =>
            onChange({ ...value, namaPekerjaan: event.target.value })
          }
          required
        />
      </label>
      <label className="full-field" htmlFor="job-instruction">
        Instruksi dokumentasi
        <textarea
          className="resize-none"
          id="job-instruction"
          aria-label="Instruksi dokumentasi"
          value={value.instruksiDokumentasi || ''}
          onChange={(event) =>
            onChange({ ...value, instruksiDokumentasi: event.target.value })
          }
        />
      </label>
      {errors.namaPekerjaan && <small role="alert">{errors.namaPekerjaan}</small>}
    </div>
  )
}
