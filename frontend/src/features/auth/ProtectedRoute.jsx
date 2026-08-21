import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider.jsx'

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth()
  if (loading) return <p role="status">Memuat sesi...</p>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/403" replace />
  return <Outlet />
}
