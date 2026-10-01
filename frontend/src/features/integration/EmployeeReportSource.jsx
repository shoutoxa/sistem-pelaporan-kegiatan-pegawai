import { useEffect, useState } from 'react'
import { ftthApi } from '../../api/ftth.js'
import FtthPage from './FtthPage.jsx'

export default function EmployeeReportSource({ mode, children }) {
  const [source, setSource] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    ftthApi.status().then((status) => {
      if (!['local', 'ftth'].includes(status.reportsSource)) throw new Error('Konfigurasi sumber laporan belum tersedia. Restart backend lalu coba lagi.')
      if (active) { setSource(status.reportsSource); setError('') }
    }).catch((e) => { if (active) setError(e.message) })
    return () => { active = false }
  }, [attempt])
  if (error) return <section className="page"><p role="alert">{error}</p><button onClick={() => setAttempt((value) => value + 1)}>Coba lagi</button></section>
  if (!source) return <section className="page"><p role="status">Menyiapkan sumber laporan…</p></section>
  return source === 'ftth' ? <FtthPage key={mode} mode={mode} /> : children
}
