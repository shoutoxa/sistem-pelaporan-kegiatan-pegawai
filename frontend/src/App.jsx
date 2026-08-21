import { useEffect, useState } from 'react'
import './styles.css'

function App() {
  const [state, setState] = useState({ status: 'loading', message: 'Memeriksa koneksi backend...' })

  useEffect(() => {
    let active = true

    fetch('http://localhost:3000/api/health', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Backend tidak sehat')
        return response.json()
      })
      .then((body) => {
        if (active) setState({ status: 'connected', message: `Backend terhubung (${body.database})` })
      })
      .catch(() => {
        if (active) setState({ status: 'offline', message: 'Backend tidak dapat dihubungi' })
      })

    return () => {
      active = false
    }
  }, [])

  if (state.status === 'loading') return <main><p role="status">{state.message}</p></main>

  return (
    <main>
      <h1>Sistem Pelaporan Kegiatan Pegawai</h1>
      <p role="status">{state.message}</p>
      {state.status === 'offline' && <p>Pastikan backend berjalan di port 3000, lalu muat ulang halaman ini.</p>}
    </main>
  )
}

export default App
