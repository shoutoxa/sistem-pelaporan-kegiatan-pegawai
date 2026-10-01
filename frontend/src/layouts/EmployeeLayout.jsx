import AppShell from '../components/AppShell.jsx'

export default function EmployeeLayout() {
  return (
    <AppShell
      roleLabel="Pegawai"
      mobileFirst
      brandMark="F"
      brandTitle="FTTH2"
      brandSub=""
      theme="ftth-dark"
      navSections={[
        { to: '/pegawai/dashboard', label: 'Dashboard', icon: 'dashboard' },
        {
          title: 'Projects',
          icon: 'folder',
          items: [
            { to: '/pegawai/projects', label: 'All Projects', icon: 'folder' },
            { to: '/pegawai/clusters', label: 'Clusters', icon: 'database' },
            { to: '/pegawai/homepass', label: 'Homepass', icon: 'home' },
          ],
        },
        {
          title: 'Report',
          icon: 'report',
          items: [
            { to: '/pegawai/laporan/new', label: 'Laporan Harian', icon: 'report' },
            {
              to: '/pegawai/histori',
              label: 'Histori Laporan',
              icon: 'history',
              isActive: (pathname) => pathname.startsWith('/pegawai/laporan/') && pathname !== '/pegawai/laporan/new',
            },
          ],
        },
      ]}
      navItems={[
        { to: '/pegawai/dashboard', label: 'Dashboard', icon: 'dashboard' },
        { to: '/pegawai/projects', label: 'Projects', icon: 'folder' },
        { to: '/pegawai/laporan/new', label: 'Laporan', icon: 'report' },
        { to: '/pegawai/histori', label: 'Histori', icon: 'history', isActive: (pathname) => pathname.startsWith('/pegawai/laporan/') && pathname !== '/pegawai/laporan/new' },
      ]}
    />
  )
}

