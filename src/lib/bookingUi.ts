import type { Booking, BookingMode, BookingStatus } from '../types/booking'

export const MODE_LABELS: Record<BookingMode, string> = {
  chat: 'Chat',
  audio: 'Audio',
  video: 'Video',
}

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

export function upcomingBookings(items: Booking[]): Booking[] {
  const now = Date.now()
  return items
    .filter((item) => item.status === 'pending' || item.status === 'accepted')
    .filter((item) => new Date(item.end_at).getTime() >= now)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
}

export function enabledModes(profile: {
  chat_enabled: boolean
  audio_enabled: boolean
  video_enabled: boolean
  consultation_modes?: string[]
}): BookingMode[] {
  if (profile.consultation_modes?.length) {
    return profile.consultation_modes.filter((mode): mode is BookingMode =>
      mode === 'chat' || mode === 'audio' || mode === 'video',
    )
  }
  const modes: BookingMode[] = []
  if (profile.chat_enabled) modes.push('chat')
  if (profile.audio_enabled) modes.push('audio')
  if (profile.video_enabled) modes.push('video')
  return modes
}
