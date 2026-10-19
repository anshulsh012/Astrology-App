import { ApiError, fetchJson } from '../lib/api';

export type AuthRole = 'customer' | 'astrologer' | 'admin';

/** Shape returned by `/api/v1/auth/*` (snake_case, matching the FastAPI schemas). */
export interface AuthUser {
  id: number;
  email: string;
  role: AuthRole;
  is_active: boolean;
  created_at: string;
}

export type AuthArea = '/' | '/customer' | '/astrologer' | '/admin';

/** Landing area for a role. Kept in one place so guards and links agree. */
export function roleArea(role: AuthRole): AuthArea {
  switch (role) {
    case 'customer':
      return '/customer';
    case 'astrologer':
      return '/astrologer';
    case 'admin':
      return '/admin';
    default:
      return '/';
  }
}

/** Fetch the current session's user. Rejects with `ApiError` (401 = signed out). */
export async function fetchCurrentUser(): Promise<AuthUser> {
  return fetchJson<AuthUser>('/api/v1/auth/me', 8000);
}

export async function performLogin(
  email: string,
  password: string,
): Promise<{ ok: boolean; user?: AuthUser; message?: string }> {
  try {
    const user = await fetchJson<AuthUser>('/api/v1/auth/login', 12000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return { ok: true, user };
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 0;
    const message =
      status === 401
        ? 'Invalid email or password'
        : status === 0
          ? 'Cannot reach the server. Check that the backend is running.'
          : `Login failed (${status})`;
    return { ok: false, message };
  }
}

export async function performRegister(
  email: string,
  password: string,
): Promise<{ ok: boolean; user?: AuthUser; message?: string }> {
  try {
    const user = await fetchJson<AuthUser>('/api/v1/auth/register', 12000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return { ok: true, user };
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 0;
    const message =
      status === 409
        ? 'An account with this email already exists'
        : status === 0
          ? 'Cannot reach the server. Check that the backend is running.'
          : `Registration failed (${status})`;
    return { ok: false, message };
  }
}

/**
 * Clear the server session. A 401 means the session was already gone, which
 * is the desired end state, so it is not treated as a failure.
 */
export async function performLogout(): Promise<void> {
  try {
    await fetchJson<{ ok: boolean }>('/api/v1/auth/logout', 8000, { method: 'POST' });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return;
    }
    throw err;
  }
}
