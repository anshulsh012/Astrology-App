import { ApiError, fetchJson } from '../lib/api'
import type { AuthArea, AuthRole, AuthUser, LoginPayload, RegisterPayload } from '../types/auth'

export type AuthAttemptResult =
  | { ok: true; user: AuthUser }
  | { ok: false; message: string; status: number }

export function roleArea(role: AuthRole): AuthArea {
  switch (role) {
    case 'astrologer':
      return '/astrologer'
    case 'admin':
      return '/admin'
    default:
      return '/customer'
  }
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  return fetchJson<AuthUser>('/api/v1/auth/me', 8000)
}

export async function login(payload: LoginPayload): Promise<AuthAttemptResult> {
  try {
    const user = await fetchJson<AuthUser>('/api/v1/auth/login', 12000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.email.trim(),
        password: payload.password,
      }),
    })
    return { ok: true, user }
  } catch (error) {
    return toAttemptError(error, 'Login failed')
  }
}

export async function register(payload: RegisterPayload): Promise<AuthAttemptResult> {
  try {
    const user = await fetchJson<AuthUser>('/api/v1/auth/register', 12000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.email.trim(),
        password: payload.password,
      }),
    })
    return { ok: true, user }
  } catch (error) {
    return toAttemptError(error, 'Registration failed')
  }
}

export async function logout(): Promise<void> {
  try {
    await fetchJson<{ ok: boolean }>('/api/v1/auth/logout', 8000, { method: 'POST' })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return
    throw error
  }
}

function toAttemptError(error: unknown, fallback: string): AuthAttemptResult {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return { ok: false, message: 'Invalid email or password', status: error.status }
    }
    if (error.status === 409) {
      return { ok: false, message: 'A user with this email already exists', status: error.status }
    }
    if (error.status === 0 || error.status === 502 || error.status === 503) {
      return { ok: false, message: error.message, status: error.status }
    }
    return {
      ok: false,
      message: error.message || `${fallback} (HTTP ${error.status})`,
      status: error.status,
    }
  }
  return { ok: false, message: fallback, status: 0 }
}
