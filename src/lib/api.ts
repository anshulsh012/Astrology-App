export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL
  if (!configured) return ''
  return configured.replace(/\/+$/, '')
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${getApiBaseUrl()}${normalized}`
}

export class ApiError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(message: string, status: number, detail: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export function formatApiDetail(detail: unknown): string | null {
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: unknown }).msg)
        }
        return null
      })
      .filter((item): item is string => Boolean(item))
    if (parts.length) return parts.join(' ')
  }
  if (detail && typeof detail === 'object' && 'message' in detail) {
    const message = (detail as { message: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return null
}

async function readBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return null
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function fetchJson<T>(
  path: string,
  timeoutMs = 8000,
  options?: RequestInit,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const headers = new Headers(options?.headers)
    if (!headers.has('Accept')) headers.set('Accept', 'application/json')

    const response = await fetch(apiUrl(path), {
      ...options,
      credentials: 'include',
      headers,
      signal: controller.signal,
    })

    const body = await readBody(response)

    if (!response.ok) {
      const detail =
        body && typeof body === 'object' && 'detail' in body
          ? (body as { detail: unknown }).detail
          : body
      const message = formatApiDetail(detail)
      if (!message && (response.status === 502 || response.status === 503)) {
        throw new ApiError(
          'Cannot reach the server. Check that the backend is running.',
          response.status,
          detail,
        )
      }
      throw new ApiError(
        message ?? `Request failed with status ${response.status}`,
        response.status,
        detail,
      )
    }

    return body as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('The server took too long to respond.', 0)
    }
    throw new ApiError('Cannot reach the server. Check that the backend is running.', 0)
  } finally {
    clearTimeout(timer)
  }
}
