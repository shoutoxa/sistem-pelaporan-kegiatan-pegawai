import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthProvider.jsx'
import ProtectedRoute from './features/auth/ProtectedRoute.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import EmployeeLayout from './layouts/EmployeeLayout.jsx'
import ForbiddenPage from './pages/ForbiddenPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ReportForm from './features/laporan/ReportForm.jsx'
import HistoryPage from './features/laporan/HistoryPage.jsx'
import ReportDetailPage from './features/laporan/ReportDetailPage.jsx'
import EditReportPage from './features/laporan/EditReportPage.jsx'
import EmployeeReportSource from './features/integration/EmployeeReportSource.jsx'
import EmployeeDashboardPage from './features/pegawai/EmployeeDashboardPage.jsx'
import EmployeeProjectsPage from './features/pegawai/EmployeeProjectsPage.jsx'
import EmployeeClustersPage from './features/pegawai/EmployeeClustersPage.jsx'
import EmployeeClusterDetailPage from './features/pegawai/EmployeeClusterDetailPage.jsx'
import EmployeeHomepassPage from './features/pegawai/EmployeeHomepassPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route element={<ProtectedRoute role="PEGAWAI" />}>
            <Route path="/pegawai" element={<EmployeeLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<EmployeeDashboardPage />} />
              <Route path="projects" element={<EmployeeProjectsPage />} />
              <Route path="clusters" element={<EmployeeClustersPage />} />
              <Route path="clusters/:id" element={<EmployeeClusterDetailPage />} />
              <Route path="homepass" element={<EmployeeHomepassPage />} />
              <Route path="laporan/new" element={<EmployeeReportRoute />} />
              <Route path="histori" element={<EmployeeReportSource mode="history"><HistoryPage /></EmployeeReportSource>} />
              <Route path="laporan/:id" element={<ReportDetailPage />} />
              <Route path="laporan/:id/edit" element={<EditReportPage />} />
            </Route>
          </Route>
          <Route path="/admin/*" element={<CompanyPortal />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

function CompanyPortal() {
  return <main className="page-state"><h1>Administrasi dikelola di FTTH</h1>
    <p>Aplikasi ini khusus pegawai. Gunakan portal perusahaan untuk pengelolaan dan verifikasi.</p>
    <a className="primary-button" href="https://ftth.digitak.id/ftth/">Buka portal FTTH</a>
  </main>
}

function EmployeeReportRoute() {
  const { user } = useAuth()
  return <EmployeeReportSource mode="form"><ReportForm user={user} /></EmployeeReportSource>
}
