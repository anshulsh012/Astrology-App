/**
 * Phase 2: typed clients for the astrologer APIs.
 *
 * Mirrors the FastAPI schemas exactly (snake_case). Errors surface the
 * backend `detail` string when available so forms can show real reasons.
 */
import { API_BASE_URL } from './api';
import { ApiError } from './api';

/** Public discovery payload — never contains approval internals or email. */
export interface PublicAstrologer {
  id: number;
  display_name: string;
  bio: string;
  profile_image_url: string | null;
  years_experience: number;
  languages: string[];
  specialties: string[];
  chat_enabled: boolean;
  audio_enabled: boolean;
  video_enabled: boolean;
  chat_rate: string | null;
  audio_rate: string | null;
  video_rate: string | null;
  consultation_modes: string[];
  min_rate_per_minute: string | null;
  is_available: boolean;
  available_from: string | null;
  available_to: string | null;
  timezone_name: string;
  created_at: string;
  updated_at: string;
}

/** Owner-facing profile payload: public shape + approval workflow state. */
export interface AstrologerProfile extends PublicAstrologer {
  approval_status: 'draft' | 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
}

/** Admin review payload: profile + applicant identity. */
export interface AdminApplication extends AstrologerProfile {
  user_id: number;
  applicant_email: string;
  applicant_is_active: boolean;
  reviewed_by_id: number | null;
}

export interface PageMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PublicAstrologerPage extends PageMeta {
  items: PublicAstrologer[];
}

export interface ApplicationPage extends PageMeta {
  items: AdminApplication[];
}

export interface ProfilePayload {
  display_name: string;
  bio: string;
  profile_image_url?: string | null;
  years_experience: number;
  languages: string[];
  specialties: string[];
  chat_enabled: boolean;
  chat_rate?: string | null;
  audio_enabled: boolean;
  audio_rate?: string | null;
  video_enabled: boolean;
  video_rate?: string | null;
  is_available?: boolean;
  available_from?: string | null;
  available_to?: string | null;
  timezone_name?: string;
}

/** Extract a human-readable message from a failed API response. */
export function describeApiError(err: unknown): string {
  if (err instanceof ApiError) {
    const detail = err.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      // FastAPI validation errors: [{ loc, msg }, ...]
      return (
        detail
          .map((item) =>
            item && typeof item === 'object' && 'msg' in item ? String(item.msg) : null,
          )
          .filter(Boolean)
          .join('; ') || `Request failed with status ${err.status}`
      );
    }
    return `Request failed with status ${err.status}`;
  }
  if (err instanceof DOMException && err.name === 'AbortError') {
    return 'The server took too long to respond.';
  }
  return 'Cannot reach the server. Check that the backend is running.';
}

/**
 * Fetch JSON with session cookies, preserving the backend `detail` payload on
 * failure (the shared `fetchJson` only keeps the status code).
 */
async function request<T>(path: string, options?: RequestInit, timeoutMs = 10000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
        ...options?.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail: unknown = null;
      try {
        const body = (await response.json()) as { detail?: unknown };
        detail = body?.detail ?? null;
      } catch {
        detail = null;
      }
      throw new ApiError(`Request failed with status ${response.status}`, response.status, detail);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Build a query string, skipping empty values. */
function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

// --- public discovery -------------------------------------------------------

export function fetchPublicAstrologers(params: {
  q?: string;
  specialty?: string;
  language?: string;
  mode?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}): Promise<PublicAstrologerPage> {
  return request<PublicAstrologerPage>(`/api/v1/astrologers${qs(params)}`);
}

// --- owner dashboard --------------------------------------------------------

export async function fetchOwnProfile(): Promise<AstrologerProfile | null> {
  try {
    return await request<AstrologerProfile>('/api/v1/astrologer/profile');
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      // No profile created yet — a normal state for new astrologers.
      return null;
    }
    throw err;
  }
}

export function createOwnProfile(payload: ProfilePayload): Promise<AstrologerProfile> {
  return request<AstrologerProfile>('/api/v1/astrologer/profile', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateOwnProfile(payload: Partial<ProfilePayload>): Promise<AstrologerProfile> {
  return request<AstrologerProfile>('/api/v1/astrologer/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function submitOwnProfile(): Promise<AstrologerProfile> {
  return request<AstrologerProfile>('/api/v1/astrologer/profile/submit', { method: 'POST' });
}

// --- admin review -----------------------------------------------------------

export function fetchApplications(params: {
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<ApplicationPage> {
  return request<ApplicationPage>(`/api/v1/admin/astrologers/applications${qs(params)}`);
}

export function approveApplication(profileId: number): Promise<AdminApplication> {
  return request<AdminApplication>(`/api/v1/admin/astrologers/${profileId}/approve`, {
    method: 'POST',
  });
}

export function rejectApplication(profileId: number, reason: string): Promise<AdminApplication> {
  return request<AdminApplication>(`/api/v1/admin/astrologers/${profileId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
