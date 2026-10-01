import { useRef, useState } from 'react'
import { API_URL } from '../../api/http.js'
import FtthDialog from './FtthDialog.jsx'

// Preview uses only the authenticated application endpoint, never upstream file_url.
export function attachmentUrl(item) {
  return /^\/api\/ftth\/reports\/[a-zA-Z0-9-]+\/attachments\/[a-zA-Z0-9-]+\/download$/.test(item.downloadUrl || '')
    ? `${API_URL}${item.downloadUrl}` : null
}
const fileName = (item) => item.original_name || item.originalName || 'Lampiran'
function PreviewContent({ item }) {
  const [failed, setFailed] = useState(false)
  const url = attachmentUrl(item), mime = item.mime_type || item.mimeType || ''
  return <>
    {/^image\/(jpeg|png|webp|gif|bmp)$/i.test(mime) && !failed
      ? <img className="ftth-preview-image" crossOrigin="use-credentials" src={url} alt={fileName(item)} onError={() => setFailed(true)} />
      : <p>{failed ? 'Foto gagal dimuat. Coba buka lampiran atau unduh berkas.' : 'Dokumen ini dapat dibuka di tab baru atau diunduh.'}</p>}
    <div className="ftth-actions"><a className="secondary-button" href={url} target="_blank" rel="noreferrer">Buka di tab baru</a>
      <a className="secondary-button" href={`${url}?mode=download`}>Unduh berkas</a></div>
  </>
}
export function AttachmentPreview({ items, initialIndex = 0, onClose, embedded = false }) {
  const [index, setIndex] = useState(initialIndex)
  const item = items[index]
  if (!item || !attachmentUrl(item)) return null
  const content = <div className="ftth-preview-content">
    {embedded && <div className="ftth-preview-heading"><button type="button" className="secondary-button" autoFocus onClick={onClose}>Kembali ke detail</button><h3>{fileName(item)}</h3></div>}
    <PreviewContent key={item.id} item={item} />
    <nav className="ftth-actions" aria-label="Navigasi lampiran"><button className="secondary-button" disabled={index === 0} onClick={() => setIndex(index - 1)}>Sebelumnya</button>
      <span aria-live="polite">Lampiran {index + 1} dari {items.length}</span>
      <button className="secondary-button" disabled={index === items.length - 1} onClick={() => setIndex(index + 1)}>Berikutnya</button></nav>
  </div>
  return embedded ? content : <FtthDialog title={fileName(item)} onClose={onClose}>{content}</FtthDialog>
}
export default function FtthAttachments({ items = [], inlinePreview = false }) {
  const [preview, setPreview] = useState(null)
  const trigger = useRef(null)
  const available = items.filter((item) => attachmentUrl(item))
  return <>
    <div hidden={inlinePreview && preview !== null}>
    {!items.length && <p>Tidak ada lampiran.</p>}
    <ul className="ftth-attachments">{items.map((item) => <li key={item.id}>
      <span className="ftth-file-name">{fileName(item)}</span>
      {attachmentUrl(item) ? <div className="ftth-file-actions">
        <button type="button" className="secondary-button" onClick={(event) => { trigger.current = event.currentTarget; setPreview(available.findIndex((x) => x.id === item.id)) }} aria-label={`Pratinjau ${fileName(item)}`}>Pratinjau</button>
        <a href={attachmentUrl(item)} target="_blank" rel="noreferrer" aria-label={`Buka ${fileName(item)}`}>Buka</a>
        <a href={`${attachmentUrl(item)}?mode=download`} aria-label={`Unduh ${fileName(item)}`}>Unduh</a>
      </div> : <span>Tautan belum tersedia</span>}
    </li>)}</ul>
    </div>
    {preview !== null && <AttachmentPreview items={available} initialIndex={preview} embedded={inlinePreview} onClose={() => {
      setPreview(null)
      requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }))
    }} />}
  </>
}
