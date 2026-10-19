/**
 * Base URL of the FastAPI backend, configurable per environment.
 * Falls back to the default local dev server when unset.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:8000';

/** Build an absolute URL for an API path, e.g. apiUrl('/api/v1/health'). */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

/** Thrown when the API responds with a non-2xx status. */
export class ApiError extends Error {
  readonly status: number;
  /** Backend `detail` payload, when the response body carried one. */
  readonly detail: unknown;

  constructor(message: string, status: number, detail: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/** Fetch JSON with timeout + status handling. Supports POST/PUT/etc. */
export async function fetchJson<T>(
  path: string,
  timeoutMs = 8000,
  options?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiUrl(path), {
      ...options,
      // The API is served from a different origin in development (and may be
      // in production); session cookies are HttpOnly and must be included.
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...options?.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiError(`Request failed with status ${response.status}`, response.status);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}