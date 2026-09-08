export default function JobFields({ value, onChange, errors = {}, categories = [] }) {
  return (
    <div className="field-grid">
      <label htmlFor="job-category">
        Kategori Pekerjaan
        <select
          id="job-category"
          aria-label="Kategori Pekerjaan"
          value={value.kategoriId || ''}
          onChange={(event) => onChange({ ...value, kategoriId: event.target.value || null })}
        >
          <option value="">Belum dikategorikan</option>
          {categories
            .filter((category) => category.isActive !== false || category.id === value.kategoriId)
            .map((category) => (
              <option key={category.id} value={category.id}>{category.namaKategori || category.name}</option>
            ))}
        </select>
      </label>
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
