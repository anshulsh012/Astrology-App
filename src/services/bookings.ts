import { ApiError, fetchJson } from '../lib/api'
import type {
  Availability,
  Booking,
  BookingMode,
  BookingPage,
  CreateBookingPayload,
} from '../types/booking'
import type { PublicAstrologer, PublicAstrologerPage } from '../types/publicAstrologer'

export async function listApprovedAstrologers(page = 1, pageSize = 50): Promise<PublicAstrologerPage> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort: 'experience_desc',
  })
  return fetchJson<PublicAstrologerPage>(`/api/v1/astrologers?${params.toString()}`)
}

export async function getApprovedAstrologer(profileId: number): Promise<PublicAstrologer> {
  return fetchJson<PublicAstrologer>(`/api/v1/astrologers/${profileId}`)
}

export async function getAvailability(
  profileId: number,
  day: string,
  mode: BookingMode,
  durationMinutes: number,
): Promise<Availability> {
  const params = new URLSearchParams({
    day,
    mode,
    duration_minutes: String(durationMinutes),
  })
  return fetchJson<Availability>(`/api/v1/bookings/availability/${profileId}?${params.toString()}`)
}

export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  return fetchJson<Booking>('/api/v1/bookings', 12000, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function listMyBookings(): Promise<BookingPage> {
  return fetchJson<BookingPage>('/api/v1/bookings/me')
}

export async function listAstrologerBookings(): Promise<BookingPage> {
  return fetchJson<BookingPage>('/api/v1/bookings/astrologer/me')
}

export async function cancelBooking(bookingId: number): Promise<Booking> {
  return fetchJson<Booking>(`/api/v1/bookings/${bookingId}/cancel`, 12000, { method: 'POST' })
}

export async function acceptBooking(bookingId: number): Promise<Booking> {
  return fetchJson<Booking>(`/api/v1/bookings/${bookingId}/accept`, 12000, { method: 'POST' })
}

export async function rejectBooking(bookingId: number): Promise<Booking> {
  return fetchJson<Booking>(`/api/v1/bookings/${bookingId}/reject`, 12000, { method: 'POST' })
}

export function bookingErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Sign in to continue.'
    if (error.status === 403) return 'This action is not allowed for your account.'
    if (error.status === 0 || error.status === 502 || error.status === 503) return error.message
    return error.message || fallback
  }
  return fallback
}

export function formatMoney(value: string): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return `₹${value}`
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatSlot(iso: string, timeZone = 'UTC'): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date)
}

export function localDateInputValue(daysAhead = 1): string {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function maxDateInputValue(daysAhead = 14): string {
  return localDateInputValue(daysAhead)
}
