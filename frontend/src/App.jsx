import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthProvider.jsx'
import ProtectedRoute from './features/auth/ProtectedRoute.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import EmployeeLayout from './layouts/EmployeeLayout.jsx'
import AdminHomePage from './pages/AdminHomePage.jsx'
import EmployeeHomePage from './pages/EmployeeHomePage.jsx'
import ForbiddenPage from './pages/ForbiddenPage.jsx'
import AdminMasterPage from './features/master-data/AdminMasterPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route element={<ProtectedRoute role="PEGAWAI" />}>
            <Route path="/pegawai" element={<EmployeeLayout />}>
              <Route index element={<EmployeeHomePage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute role="SUPERADMIN" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminHomePage />} />
              <Route path="master" element={<AdminMasterPage />} />
            </Route>
          </Route>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
