import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'

import {
  fetchCurrentSession,
  logoutSession,
  type AuthUser,
} from './authApi'

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  logout: () => Promise<void>
  recheck: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [recheckKey, setRecheckKey] = useState(0)

  const recheck = useCallback(() => setRecheckKey((k) => k + 1), [])

  useEffect(() => {
    let mounted = true
    setStatus('checking')

    fetchCurrentSession()
      .then((payload) => {
        if (!mounted) return
        setUser(payload.user)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!mounted) return
        setUser(null)
        setStatus('unauthenticated')
      })

    return () => {
      mounted = false
    }
  }, [recheckKey])

  const logout = useCallback(async () => {
    try {
      await logoutSession()
    } catch {
      // Ignore — we clear client state regardless.
    }
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  return (
    <AuthContext.Provider value={{ status, user, logout, recheck }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
