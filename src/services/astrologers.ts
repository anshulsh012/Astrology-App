import { featuredAstrologers } from '../data/astrologers'
import type {
  Astrologer,
  AstrologerListResult,
  AstrologerQuery,
  SpecialtyId,
} from '../types/astrologer'

const SAMPLE_LOAD_MS = 220

export const specialtyOptions: Array<{ id: SpecialtyId | 'all'; label: string }> = [
  { id: 'all', label: 'All specialties' },
  { id: 'love', label: 'Love' },
  { id: 'career', label: 'Career' },
  { id: 'health', label: 'Health' },
  { id: 'finance', label: 'Finance' },
  { id: 'marriage', label: 'Marriage' },
  { id: 'kundali', label: 'Kundali' },
]

export const sortOptions = [
  { id: 'featured', label: 'Featured' },
  { id: 'experience', label: 'Most experience' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'name', label: 'Name' },
] as const

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function matchesQuery(astrologer: Astrologer, query: AstrologerQuery) {
  const needle = query.q?.trim().toLowerCase() ?? ''
  if (needle) {
    const haystack = [
      astrologer.name,
      astrologer.title,
      ...astrologer.specialties,
      ...astrologer.languages,
    ]
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(needle)) return false
  }

  if (query.specialty && query.specialty !== 'all') {
    if (!astrologer.specialtyIds.includes(query.specialty)) return false
  }

  return true
}

function sortAstrologers(items: Astrologer[], sort: AstrologerQuery['sort']) {
  const next = [...items]
  switch (sort) {
    case 'experience':
      return next.sort((a, b) => b.experienceYears - a.experienceYears)
    case 'price-asc':
      return next.sort((a, b) => a.pricePerMinute - b.pricePerMinute)
    case 'price-desc':
      return next.sort((a, b) => b.pricePerMinute - a.pricePerMinute)
    case 'name':
      return next.sort((a, b) => a.name.localeCompare(b.name))
    default:
      return next
  }
}

export async function listAstrologers(query: AstrologerQuery = {}): Promise<AstrologerListResult> {
  await wait(SAMPLE_LOAD_MS)
  const filtered = featuredAstrologers.filter((item) => matchesQuery(item, query))
  return {
    items: sortAstrologers(filtered, query.sort ?? 'featured'),
    total: filtered.length,
    source: 'sample',
  }
}

export async function getAstrologerById(id: string): Promise<Astrologer | null> {
  await wait(SAMPLE_LOAD_MS)
  return featuredAstrologers.find((item) => item.id === id) ?? null
}

export function getFeaturedAstrologers() {
  return featuredAstrologers.slice(0, 4)
}

export function parseSpecialty(value: string | null): SpecialtyId | 'all' {
  const known = specialtyOptions.map((item) => item.id)
  if (value && known.includes(value as SpecialtyId | 'all')) {
    return value as SpecialtyId | 'all'
  }
  return 'all'
}

export function parseSort(value: string | null): AstrologerQuery['sort'] {
  const known = sortOptions.map((item) => item.id)
  if (value && known.includes(value as (typeof sortOptions)[number]['id'])) {
    return value as AstrologerQuery['sort']
  }
  return 'featured'
}
