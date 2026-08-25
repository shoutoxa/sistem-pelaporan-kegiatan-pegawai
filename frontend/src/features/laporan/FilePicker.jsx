import { useEffect, useId, useRef, useState } from "react";

export default function FilePicker({
  files,
  onChange,
  maxFiles = 5,
  maxBytes = 10_000_000,
}) {
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [urls, setUrls] = useState(() => new Map());
  const urlsRef = useRef(urls);
  const cameraInputId = useId();
  const galleryInputId = "report-gallery-input";

  useEffect(() => {
    urlsRef.current = urls;
  }, [urls]);
  useEffect(
    () => () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlsRef.current.clear();
    },
    [],
  );

  function addFiles(fileList) {
    const selected = Array.from(fileList || []);
    if (selected.length + files.length > maxFiles) {
      setError(`Maksimal ${maxFiles} foto.`);
      return;
    }
    const invalid = selected.find(
      (file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type),
    );
    if (invalid) {
      setError("Format foto harus JPG, PNG, atau WEBP.");
      return;
    }
    const oversized = selected.find((file) => file.size > maxBytes);
    if (oversized) {
      setError("Ukuran setiap foto maksimal 10 MB.");
      return;
    }
    setError("");
    setUrls((current) => {
      const next = new Map(current);
      selected.forEach((file) => next.set(file, URL.createObjectURL(file)));
      return next;
    });
    onChange([...files, ...selected]);
  }

  function handleChange(event) {
    addFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function removeFile(file) {
    const url = urls.get(file);
    if (url) URL.revokeObjectURL(url);
    setUrls((current) => {
      const next = new Map(current);
      next.delete(file);
      return next;
    });
    onChange(files.filter((item) => item !== file));
  }

  return (
    <div className="file-picker">
      <div
        className={`upload-zone ${dragging ? "dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <span className="upload-icon" aria-hidden="true">↑</span>
        <div className="upload-copy">
          <strong>
            Tambahkan foto kegiatan dari kamera atau galeri
          </strong>
          <small>
            JPG, PNG, atau WEBP · Maks. 10 MB per foto · 1–{maxFiles} foto
          </small>
        </div>
        <div className="upload-actions">
          <label className="secondary-button" htmlFor={cameraInputId}>Ambil foto</label>
          <label className="primary-button" htmlFor={galleryInputId}>Pilih galeri</label>
        </div>
        <input
          className="sr-only"
          id={cameraInputId}
          aria-label="Ambil foto dengan kamera"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
        />
        <input
          className="sr-only"
          id={galleryInputId}
          aria-label="Dokumentasi"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleChange}
        />
      </div>
      <div className="file-picker-meta">
        <span>
          {files.length} dari {maxFiles} foto dipilih
        </span>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="preview-list">
        {files.map((file) => (
          <figure key={`${file.name}-${file.lastModified}`}>
            <img src={urls.get(file)} alt={`Pratinjau ${file.name}`} />
            <figcaption>
              <strong>{file.name}</strong>
              <small>
                {(file.size / 1_000_000).toFixed(2)} MB ·{" "}
                {file.type.replace("image/", "").toUpperCase()}
              </small>
            </figcaption>
            <button
              className="danger-outline"
              type="button"
              aria-label={`Hapus ${file.name}`}
              onClick={() => removeFile(file)}
            >
              Hapus
            </button>
          </figure>
        ))}
      </div>
    </div>
  );
}
