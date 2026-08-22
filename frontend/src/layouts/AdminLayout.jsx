import AppShell from '../components/AppShell.jsx'

export default function AdminLayout() {
  return <AppShell roleLabel="Superadmin" navItems={[
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/admin/laporan', label: 'Laporan', icon: 'report' },
    { to: '/admin/pegawai', label: 'Pegawai', icon: 'users' },
    { to: '/admin/master', label: 'Master Data', icon: 'database' },
  ]} />
}
