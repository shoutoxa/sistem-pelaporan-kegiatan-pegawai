import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import Icon from '../components/Icon.jsx'

export default function NotFoundPage() {
  useEffect(() => { document.title = 'Halaman tidak ditemukan — Sistem Pelaporan' }, [])
  return <main className="route-error"><span className="route-error-code">404</span><h1>Halaman tidak ditemukan</h1><p>Alamat yang Anda buka tidak tersedia atau sudah berubah.</p><Link className="primary-button icon-label" to="/"><Icon name="arrowLeft" />Kembali ke beranda</Link></main>
}
