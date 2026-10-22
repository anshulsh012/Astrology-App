import type { AuthUser } from '../types/auth'

export const CUSTOMER: AuthUser = {
  id: 1,
  email: 'user@example.com',
  role: 'customer',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

export const ADMIN: AuthUser = {
  id: 2,
  email: 'admin@example.com',
  role: 'admin',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

export const ASTROLOGER: AuthUser = {
  id: 3,
  email: 'astro@example.com',
  role: 'astrologer',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

export function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  } as unknown as Response
}

export function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    return Promise.resolve(handler(url, init))
  })
  globalThis.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}
