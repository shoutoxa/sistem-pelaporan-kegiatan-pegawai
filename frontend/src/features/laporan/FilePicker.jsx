import { useEffect, useRef, useState } from 'react'

export default function FilePicker({ files, onChange, maxFiles = 5, maxBytes = 10_000_000 }) {
  const [error, setError] = useState('')
  const [urls, setUrls] = useState(() => new Map())
  const urlsRef = useRef(urls)

  useEffect(() => { urlsRef.current = urls }, [urls])
  useEffect(() => () => { urlsRef.current.forEach((url) => URL.revokeObjectURL(url)); urlsRef.current.clear() }, [])

  function handleChange(event) {
    const selected = Array.from(event.target.files || [])
    if (selected.length + files.length > maxFiles) { setError(`Maksimal ${maxFiles} foto.`); return }
    const invalid = selected.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    if (invalid) { setError('Format foto harus JPG, PNG, atau WEBP.'); return }
    const oversized = selected.find((file) => file.size > maxBytes)
    if (oversized) { setError('Ukuran setiap foto maksimal 10 MB.'); return }
    setError('')
    setUrls((current) => {
      const next = new Map(current)
      selected.forEach((file) => next.set(file, URL.createObjectURL(file)))
      return next
    })
    onChange([...files, ...selected])
    event.target.value = ''
  }

  function removeFile(file) {
    const url = urls.get(file)
    if (url) URL.revokeObjectURL(url)
    setUrls((current) => { const next = new Map(current); next.delete(file); return next })
    onChange(files.filter((item) => item !== file))
  }

  return <div className="file-picker"><label>Dokumentasi<input aria-label="Dokumentasi" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleChange} /></label><p>{files.length} dari maksimal {maxFiles} foto</p>{error && <p role="alert">{error}</p>}<div className="preview-grid">{files.map((file) => <figure key={`${file.name}-${file.lastModified}`}><img src={urls.get(file)} alt={file.name} /><figcaption><span>{file.name}</span><button type="button" onClick={() => removeFile(file)}>Hapus</button></figcaption></figure>)}</div></div>
}
