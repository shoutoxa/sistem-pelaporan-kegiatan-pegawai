import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthProvider.jsx'
import ProtectedRoute from './features/auth/ProtectedRoute.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import EmployeeLayout from './layouts/EmployeeLayout.jsx'
import ForbiddenPage from './pages/ForbiddenPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import AdminMasterPage from './features/master-data/AdminMasterPage.jsx'
import ReportForm from './features/laporan/ReportForm.jsx'
import HistoryPage from './features/laporan/HistoryPage.jsx'
import ReportDetailPage from './features/laporan/ReportDetailPage.jsx'
import DashboardPage from './features/dashboard/DashboardPage.jsx'
import AdminReportsPage from './features/dashboard/AdminReportsPage.jsx'
import AdminEmployeesPage from './features/pegawai/AdminEmployeesPage.jsx'
import EditReportPage from './features/laporan/EditReportPage.jsx'

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
              <Route index element={<Navigate to="laporan/new" replace />} />
              <Route path="laporan/new" element={<EmployeeReportRoute />} />
              <Route path="histori" element={<HistoryPage />} />
              <Route path="laporan/:id" element={<ReportDetailPage />} />
              <Route path="laporan/:id/edit" element={<EditReportPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute role="SUPERADMIN" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="laporan" element={<AdminReportsPage />} />
              <Route path="laporan/:id" element={<ReportDetailPage />} />
              <Route path="pegawai" element={<AdminEmployeesPage />} />
              <Route path="master" element={<AdminMasterPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

function EmployeeReportRoute() {
  const { user } = useAuth()
  return <ReportForm user={user} />
}
