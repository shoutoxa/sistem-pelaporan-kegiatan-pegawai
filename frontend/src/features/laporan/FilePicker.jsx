import { useEffect, useRef, useState } from 'react'

export default function FilePicker({ files, onChange, maxFiles = 5, maxBytes = 10_000_000 }) {
  const [error, setError] = useState('')
  const urls = useRef(new Map())

  useEffect(() => () => { urls.current.forEach((url) => URL.revokeObjectURL(url)); urls.current.clear() }, [])

  function handleChange(event) {
    const selected = Array.from(event.target.files || [])
    if (selected.length + files.length > maxFiles) { setError(`Maksimal ${maxFiles} foto.`); return }
    const invalid = selected.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    if (invalid) { setError('Format foto harus JPG, PNG, atau WEBP.'); return }
    const oversized = selected.find((file) => file.size > maxBytes)
    if (oversized) { setError('Ukuran setiap foto maksimal 10 MB.'); return }
    setError('')
    selected.forEach((file) => urls.current.set(file, URL.createObjectURL(file)))
    onChange([...files, ...selected])
    event.target.value = ''
  }

  function removeFile(file) {
    const url = urls.current.get(file)
    if (url) URL.revokeObjectURL(url)
    urls.current.delete(file)
    onChange(files.filter((item) => item !== file))
  }

  return <div className="file-picker"><label>Dokumentasi<input aria-label="Dokumentasi" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleChange} /></label><p>{files.length} dari maksimal {maxFiles} foto</p>{error && <p role="alert">{error}</p>}<div className="preview-grid">{files.map((file) => <figure key={`${file.name}-${file.lastModified}`}><img src={urls.current.get(file) || URL.createObjectURL(file)} alt={file.name} /><figcaption><span>{file.name}</span><button type="button" onClick={() => removeFile(file)}>Hapus</button></figcaption></figure>)}</div></div>
}
