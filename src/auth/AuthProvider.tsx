import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError } from '../lib/api'
import { logout as performLogout } from '../services/auth'
import type { AuthUser } from '../types/auth'
import { AuthContext, type AuthStatus } from './authContext'
import { probeSession } from './sessionProbe'

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.status === 502 || error.status === 503) {
      return error.message
    }
    if (error.status >= 500) {
      return `The server could not complete the session check (HTTP ${error.status}).`
    }
    return `The session check failed (HTTP ${error.status}).`
  }
  return 'Cannot reach the server. Check that the backend is running.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const requestSeq = useRef(0)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    const seq = ++requestSeq.current
    setStatus('loading')
    setError(null)

    try {
      const current = await probeSession()
      if (!mounted.current || seq !== requestSeq.current) return
      setUser(current)
      setStatus('authenticated')
    } catch (caught) {
      if (!mounted.current || seq !== requestSeq.current) return
      setUser(null)
      if (caught instanceof ApiError && caught.status === 401) {
        setStatus('unauthenticated')
        setError(null)
        return
      }
      setStatus('error')
      setError(describeError(caught))
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    const seq = ++requestSeq.current

    probeSession()
      .then((current) => {
        if (!mounted.current || seq !== requestSeq.current) return
        setUser(current)
        setStatus('authenticated')
      })
      .catch((caught) => {
        if (!mounted.current || seq !== requestSeq.current) return
        setUser(null)
        if (caught instanceof ApiError && caught.status === 401) {
          setStatus('unauthenticated')
          setError(null)
          return
        }
        setStatus('error')
        setError(describeError(caught))
      })

    return () => {
      mounted.current = false
      requestSeq.current += 1
    }
  }, [])

  const signIn = useCallback((nextUser: AuthUser) => {
    requestSeq.current += 1
    setUser(nextUser)
    setStatus('authenticated')
    setError(null)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await performLogout()
    } catch {
      // Local session must clear even if logout cannot reach the server.
    }
    requestSeq.current += 1
    setUser(null)
    setStatus('unauthenticated')
    setError(null)
  }, [])

  const value = useMemo(
    () => ({ status, user, error, refresh, signIn, signOut }),
    [status, user, error, refresh, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
