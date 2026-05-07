import { createContext, useContext } from 'react'
import type { AuthUser } from './authApi'

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  isGuest: boolean
  logout: () => Promise<void>
  recheck: () => void
  loginAsGuest: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export const GUEST_SESSION_STORAGE_KEY = 'sislope_guest_session'

export const GUEST_USER: AuthUser = {
  id: 'guest',
  username: 'Invitado',
  email: 'guest@sislope.local',
  role: 'guest',
  status: 'active',
  mustChangePassword: false,
}

export function isGuestUser(user: AuthUser | null): boolean {
  return user?.role === 'guest'
}
