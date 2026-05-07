import {
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
import {
  AuthContext,
  GUEST_SESSION_STORAGE_KEY,
  GUEST_USER,
  isGuestUser,
  type AuthStatus,
} from './authState'

let pendingHandoffCode: string | null = null
let pendingHandoffExchange: Promise<AuthSessionPayload> | null = null
const trackedSessionIds = new Set<string>()

function readGuestSession(): boolean {
  try {
    return window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeGuestSession(active: boolean): void {
  try {
    if (active) {
      window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, '1')
    } else {
      window.localStorage.removeItem(GUEST_SESSION_STORAGE_KEY)
    }
  } catch {
    // ignore — guest persistence is best-effort
  }
}

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
  // Read the guest flag once during initial render so the auth state starts in
  // the right shape and we never have to setState() synchronously inside the
  // mount effect (the react-hooks/set-state-in-effect rule rejects that).
  const initialGuest = readGuestSession()
  const [status, setStatus] = useState<AuthStatus>(
    initialGuest ? 'authenticated' : 'checking',
  )
  const [user, setUser] = useState<AuthUser | null>(initialGuest ? GUEST_USER : null)
  const [recheckKey, setRecheckKey] = useState(0)

  const recheck = useCallback(() => {
    setStatus('checking')
    setRecheckKey((k) => k + 1)
  }, [])

  useEffect(() => {
    let mounted = true

    // If we hydrated as a guest the API check is skipped entirely.
    if (readGuestSession()) {
      return () => {
        mounted = false
      }
    }

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

  const loginAsGuest = useCallback(() => {
    writeGuestSession(true)
    setUser(GUEST_USER)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    if (isGuestUser(user)) {
      writeGuestSession(false)
      setUser(null)
      setStatus('unauthenticated')
      return
    }

    try {
      await logoutSession()
    } catch {
      // Ignore — we clear client state regardless.
    }
    writeGuestSession(false)
    setUser(null)
    setStatus('unauthenticated')
  }, [user])

  const isGuest = isGuestUser(user)

  return (
    <AuthContext.Provider
      value={{ status, user, isGuest, logout, recheck, loginAsGuest }}
    >
      {children}
    </AuthContext.Provider>
  )
}
