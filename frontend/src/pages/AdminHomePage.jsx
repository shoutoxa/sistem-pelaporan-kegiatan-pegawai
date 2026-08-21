import { Link } from 'react-router-dom'

export default function AdminHomePage() {
  return <section className="page"><h1>Dashboard Superadmin</h1><p>Ringkasan laporan akan tersedia setelah slice pelaporan selesai.</p><Link to="/admin/master">Kelola master data</Link></section>
}
