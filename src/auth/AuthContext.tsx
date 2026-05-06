import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'

import {
  exchangeHandoffCode,
  fetchCurrentSession,
  logoutSession,
  trackDataTradeEvent,
  type AuthSessionPayload,
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

let pendingHandoffCode: string | null = null
let pendingHandoffExchange: Promise<AuthSessionPayload> | null = null
const trackedSessionIds = new Set<string>()

function clearHandoffFromUrl() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('handoff')) {
    return
  }

  url.searchParams.delete('handoff')
  window.history.replaceState(null, document.title, `${url.pathname}${url.search}${url.hash}`)
}

function exchangeHandoffOnce(code: string) {
  if (pendingHandoffCode !== code || !pendingHandoffExchange) {
    pendingHandoffCode = code
    pendingHandoffExchange = exchangeHandoffCode(code, 'sislope')
  }

  return pendingHandoffExchange
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [recheckKey, setRecheckKey] = useState(0)

  const recheck = useCallback(() => setRecheckKey((k) => k + 1), [])

  useEffect(() => {
    let mounted = true
    setStatus('checking')

    async function resolveSession() {
      const url = new URL(window.location.href)
      const handoffCode = url.searchParams.get('handoff')?.trim()

      if (handoffCode) {
        const payload = await exchangeHandoffOnce(handoffCode)
        clearHandoffFromUrl()
        return payload
      }

      return fetchCurrentSession()
    }

    resolveSession()
      .then((payload) => {
        if (!mounted) return
        setUser(payload.user)
        setStatus('authenticated')
        if (!trackedSessionIds.has(payload.session.id)) {
          trackedSessionIds.add(payload.session.id)
          void trackDataTradeEvent('module_opened')
        }
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
