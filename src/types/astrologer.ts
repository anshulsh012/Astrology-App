export type SpecialtyId =
  | 'love'
  | 'career'
  | 'health'
  | 'finance'
  | 'marriage'
  | 'kundali'

export type Astrologer = {
  id: string
  name: string
  title: string
  specialties: string[]
  specialtyIds: SpecialtyId[]
  languages: string[]
  experienceYears: number
  indicativeScore: number
  sampleNote: string
  pricePerMinute: number
  currency: 'INR'
  bio: string
  approach: string
  portrait: {
    initials: string
    from: string
    to: string
    accent: string
  }
  sample: true
}

export type AstrologerQuery = {
  q?: string
  specialty?: SpecialtyId | 'all'
  sort?: 'featured' | 'experience' | 'price-asc' | 'price-desc' | 'name'
}

export type AstrologerListResult = {
  items: Astrologer[]
  total: number
  source: 'sample'
}
