import AppShell from '../components/AppShell.jsx'

export default function EmployeeLayout() {
  return <AppShell roleLabel="Pegawai" mobileFirst navItems={[
    { to: '/pegawai/laporan/new', label: 'Buat laporan', icon: 'report' },
    { to: '/pegawai/histori', label: 'Histori', icon: 'history', isActive: (pathname) => pathname.startsWith('/pegawai/laporan/') && pathname !== '/pegawai/laporan/new' },
  ]} />
}
