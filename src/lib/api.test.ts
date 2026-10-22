import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiUrl, fetchJson, formatApiDetail } from './api'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('api client', () => {
  it('keeps same-origin paths when no base URL is configured', () => {
    expect(apiUrl('/api/v1/auth/me')).toBe('/api/v1/auth/me')
  })

  it('sends credentials and JSON accept headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ ok: true }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await fetchJson('/api/v1/auth/logout', 1000, { method: 'POST' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    )
  })

  it('parses FastAPI detail messages on HTTP errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({ detail: 'Invalid email or password' }),
    }) as unknown as typeof fetch

    await expect(fetchJson('/api/v1/auth/login')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Invalid email or password',
    })
  })

  it('turns network failures into a reachable error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch

    await expect(fetchJson('/api/v1/auth/me')).rejects.toBeInstanceOf(ApiError)
    await expect(fetchJson('/api/v1/auth/me')).rejects.toMatchObject({ status: 0 })
  })

  it('maps empty 502/503 proxy failures to an unreachable backend', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: { get: () => 'text/plain' },
      json: async () => {
        throw new Error('not json')
      },
    }) as unknown as typeof fetch

    await expect(fetchJson('/api/v1/auth/register')).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      message: 'Cannot reach the server. Check that the backend is running.',
    })
  })

  it('keeps FastAPI JSON 503 detail when the proxy returns it', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: { get: () => 'application/json' },
      json: async () => ({
        detail: 'Cannot reach the server. Check that the backend is running.',
      }),
    }) as unknown as typeof fetch

    await expect(fetchJson('/api/v1/auth/register')).rejects.toMatchObject({
      status: 503,
      message: 'Cannot reach the server. Check that the backend is running.',
    })
  })

  it('formats validation arrays', () => {
    expect(formatApiDetail([{ loc: ['body', 'password'], msg: 'String should have at least 8 characters' }])).toBe(
      'String should have at least 8 characters',
    )
  })
})
