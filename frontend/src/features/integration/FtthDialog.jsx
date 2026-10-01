import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import './ftth.css'

export default function FtthDialog({ title, onClose, children, responsive = false }) {
  const dialog = useRef(null), titleId = useId()
  const previous = useRef(document.activeElement)
  useEffect(() => {
    const node = dialog.current, overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    node.showModal()
    return () => { node.close(); document.body.style.overflow = overflow; if (previous.current?.isConnected) previous.current.focus({ preventScroll: true }) }
  }, [])
  return createPortal(<dialog ref={dialog} className={`ftth-dialog${responsive ? ' ftth-detail-dialog' : ''}`} aria-labelledby={titleId} onCancel={(e) => { e.preventDefault(); onClose() }}
    onClick={(e) => { if (e.target === dialog.current) onClose() }}>
    <div className="ftth-dialog-content"><header><h2 id={titleId}>{title}</h2><button type="button" className="secondary-button" autoFocus onClick={onClose}>Tutup</button></header>
      {children}
    </div>
  </dialog>, document.body)
}
