import { useEffect, useId, useRef, useState } from "react";

const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];
const DOC_MIME = [
  "application/pdf",
  "application/vnd.google-earth.kmz",
  "application/vnd.google-earth.kml+xml",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/zip",
];
const ALL_MIME = [...IMAGE_MIME, ...DOC_MIME];

function getFileIcon(mimeType) {
  if (mimeType.startsWith("image/")) return "🖼";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("kmz") || mimeType.includes("kml")) return "🗺️";
  if (mimeType === "application/zip") return "📦";
  return "📎";
}

export default function FilePicker({
  files,
  onChange,
  maxFiles = 5,
  maxBytes = 10_000_000,
  acceptTypes = "all",
}) {
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [urls, setUrls] = useState(() => new Map());
  const urlsRef = useRef(urls);
  const cameraInputId = useId();
  const galleryInputId = "report-gallery-input";

  const allowedTypes = acceptTypes === "image" ? IMAGE_MIME : ALL_MIME;
  const acceptString = acceptTypes === "image" ? "image/*" : ".pdf,.kmz,.kml,.xlsx,.xls,.zip,image/*";

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
      setError(`Maksimal ${maxFiles} file.`);
      return;
    }
    const invalid = selected.find((file) => !allowedTypes.includes(file.type));
    if (invalid) {
      const typeLabel = acceptTypes === "image" ? "JPG, PNG, atau WEBP" : "JPG, PNG, PDF, KMZ, KML, XLSX, atau ZIP";
      setError(`Format file tidak diizinkan. Gunakan ${typeLabel}.`);
      return;
    }
    const oversized = selected.find((file) => file.size > maxBytes);
    if (oversized) {
      setError(`Ukuran setiap file maksimal ${(maxBytes / 1_000_000).toFixed(0)} MB.`);
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
            Tambahkan file dari kamera atau galeri
          </strong>
          <small>
            {acceptTypes === "image"
              ? "JPG, PNG, atau WEBP · Maks. 20 MB per file · 1–10 file"
              : "JPG, PNG, PDF, KMZ, KML, XLSX, ZIP · Maks. 20 MB per file · 1–10 file"}
          </small>
        </div>
        <div className="upload-actions">
          <label className="secondary-button" htmlFor={cameraInputId}>Ambil foto</label>
          <label className="primary-button" htmlFor={galleryInputId}>Pilih file</label>
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
          accept={acceptString}
          multiple
          onChange={handleChange}
        />
      </div>
      <div className="file-picker-meta">
        <span>
          {files.length} dari {maxFiles} file dipilih
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
            {file.type.startsWith("image/") ? (
              <img src={urls.get(file)} alt={`Pratinjau ${file.name}`} />
            ) : (
              <div className="file-icon-preview">{getFileIcon(file.type)}</div>
            )}
            <figcaption>
              <strong>{file.name}</strong>
              <small>
                {(file.size / 1_000_000).toFixed(2)} MB ·{" "}
                {file.type.replace(/[a-z.\-]+/, "").toUpperCase() || file.type.split("/")[1]?.toUpperCase()}
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