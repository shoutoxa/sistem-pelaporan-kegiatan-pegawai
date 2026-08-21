import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../../api/auth.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const result = await authApi.me()
      setUser(result.user)
      return result.user
    } catch (error) {
      if (error.status === 401 || error.status === undefined) setUser(null)
      throw error
    }
  }, [])

  useEffect(() => {
    refreshUser().catch(() => undefined).finally(() => setLoading(false))
  }, [refreshUser])

  const login = useCallback(async (credentials) => {
    await authApi.login(credentials)
    return refreshUser()
  }, [refreshUser])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout, refreshUser }), [user, loading, login, logout, refreshUser])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth harus digunakan di dalam AuthProvider.')
  return context
}
