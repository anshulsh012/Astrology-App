export type PublicAstrologer = {
  id: number
  display_name: string
  bio: string
  profile_image_url: string | null
  years_experience: number
  languages: string[]
  specialties: string[]
  chat_enabled: boolean
  audio_enabled: boolean
  video_enabled: boolean
  chat_rate: string | null
  audio_rate: string | null
  video_rate: string | null
  consultation_modes: string[]
  min_rate_per_minute: string | null
  is_available: boolean
  available_from: string | null
  available_to: string | null
  timezone_name: string
  created_at: string
  updated_at: string
}

export type PublicAstrologerPage = {
  items: PublicAstrologer[]
  page: number
  page_size: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}
