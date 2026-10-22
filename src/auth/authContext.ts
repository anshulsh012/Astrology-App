import { createContext } from 'react'
import type { AuthUser } from '../types/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

export type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  error: string | null
  refresh: () => Promise<void>
  signIn: (user: AuthUser) => void
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
