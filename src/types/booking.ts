export type BookingMode = 'chat' | 'audio' | 'video'
export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

export type Booking = {
  id: number
  customer_id: number
  astrologer_profile_id: number
  mode: BookingMode
  start_at: string
  end_at: string
  status: BookingStatus
  topic: string | null
  duration_minutes: number
  rate_per_minute: string
  quoted_total: string
  decision_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
  astrologer_name: string
  customer_ref: string
}

export type BookingPage = {
  items: Booking[]
  page: number
  page_size: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export type Slot = {
  start_at: string
  end_at: string
  duration_minutes: number
  rate_per_minute: string
  quoted_total: string
}

export type Availability = {
  astrologer_profile_id: number
  astrologer_name: string
  timezone_name: string
  date: string
  mode: BookingMode
  duration_minutes: number
  is_available: boolean
  slots: Slot[]
  detail: string | null
}

export type CreateBookingPayload = {
  astrologer_profile_id: number
  mode: BookingMode
  start_at: string
  end_at: string
  topic?: string
}

export const BOOKING_DURATIONS = [15, 30, 45, 60] as const
