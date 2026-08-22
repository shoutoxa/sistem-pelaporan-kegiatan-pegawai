import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider.jsx'

export default function LoginPage() {
  const { login, loading, user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to={user.role === 'SUPERADMIN' ? '/admin/dashboard' : '/pegawai/laporan/new'} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const signedInUser = await login(form)
      navigate(signedInUser.role === 'SUPERADMIN' ? '/admin/dashboard' : '/pegawai/laporan/new', { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Username atau password tidak valid.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-card">
      <h1>Masuk ke Sistem Pelaporan</h1>
      <p>Gunakan akun pegawai atau Superadmin yang sudah disiapkan.</p>
      <form onSubmit={handleSubmit}>
        <label>Username<input aria-label="Username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required /></label>
        <label>Password<input aria-label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>{submitting ? 'Memproses...' : 'Masuk'}</button>
      </form>
    </main>
  )
}
