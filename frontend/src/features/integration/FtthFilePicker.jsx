import { useEffect, useId, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
export const fileSelectionError = (files) => {
  if (files.length > 5) return 'Maksimal 5 lampiran.'
  if (files.some((file) => !allowedTypes.includes(file.type))) return 'Format lampiran harus JPG, PNG, WEBP, atau PDF.'
  if (files.some((file) => !file.size || file.size > 10000000)) return 'Setiap lampiran harus berisi data dan maksimal 10 MB.'
  return ''
}

function FileThumbnail({ file }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!file.type.startsWith('image/')) return
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return url ? <img src={url} alt={`Pratinjau ${file.name}`} /> : <span className="ftth-document-icon"><Icon name="report" />PDF</span>
}

export default function FtthFilePicker({ files, onChange, disabled = false }) {
  const inputId = useId(), helpId = useId()
  const camera = useRef(null), gallery = useRef(null)
  const [error, setError] = useState(''), [dragging, setDragging] = useState(false)
  function add(selected) {
    if (disabled) return
    const next = [...files]
    for (const file of Array.from(selected || [])) {
      if (!next.some((x) => x.name === file.name && x.size === file.size && x.lastModified === file.lastModified && x.type === file.type)) next.push(file)
    }
    const problem = fileSelectionError(next)
    setError(problem)
    if (!problem) onChange(next)
  }
  function change(event) { add(event.target.files); event.target.value = '' }
  return <div className="ftth-file-picker">
    <div className={`ftth-dropzone ${dragging ? 'is-dragging' : ''}`} onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files) }}>
      <Icon name="upload" size={28} />
      <label htmlFor={inputId}>Lampiran (1–5 berkas, maksimal 10 MB per berkas)</label>
      <p id={helpId}>Tarik foto atau PDF ke sini, atau pilih dari perangkat.</p>
      <div className="ftth-actions"><button type="button" disabled={disabled} onClick={() => camera.current?.click()}>Ambil foto</button>
        <button type="button" disabled={disabled} onClick={() => gallery.current?.click()}>Pilih berkas</button></div>
      <input ref={gallery} id={inputId} className="sr-only" aria-describedby={helpId} type="file" disabled={disabled} multiple accept={allowedTypes.join(',')} onChange={change} />
      <input ref={camera} className="sr-only" aria-label="Ambil foto dengan kamera" type="file" disabled={disabled} accept="image/jpeg,image/png,image/webp" capture="environment" onChange={change} />
    </div>
    <p className="ftth-helper">{files.length} dari 5 lampiran dipilih · JPG, PNG, WEBP, PDF</p>
    {error && <p role="alert" className="ftth-error">{error}</p>}
    <ul className="ftth-file-grid" aria-label="Berkas dipilih">{files.map((file) => <li key={`${file.name}-${file.size}-${file.lastModified}`}>
      <FileThumbnail file={file} /><strong>{file.name}</strong><small>{(file.size / 1000000).toFixed(2)} MB</small>
      <button type="button" disabled={disabled} aria-label={`Hapus ${file.name}`} onClick={() => { onChange(files.filter((x) => x !== file)); setError('') }}>Hapus</button>
    </li>)}</ul>
  </div>
}
