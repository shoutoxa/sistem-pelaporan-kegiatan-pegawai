import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import Icon from '../components/Icon.jsx'

export default function ForbiddenPage() {
  useEffect(() => { document.title = 'Akses ditolak — Sistem Pelaporan' }, [])
  return <main className="route-error"><span className="route-error-code">403</span><h1>Akses ditolak</h1><p>Role akun ini tidak memiliki akses ke halaman tersebut. Kembali ke area kerja yang sesuai dengan akun Anda.</p><Link className="primary-button icon-label" to="/"><Icon name="arrowLeft" />Kembali ke beranda</Link></main>
}
