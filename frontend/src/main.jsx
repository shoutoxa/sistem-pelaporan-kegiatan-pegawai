import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Catch and suppress rogue browser extensions / DevTools performance observer crashes
// such as "Cannot read properties of undefined (reading 'startTime') at et.reportAllChanges"
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event?.message || ''
    if (msg.includes('startTime') || msg.includes('reportAllChanges')) {
      event.preventDefault()
      event.stopPropagation()
    }
  })

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event?.reason?.message || ''
    if (msg.includes('startTime') || msg.includes('reportAllChanges')) {
      event.preventDefault()
    }
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
