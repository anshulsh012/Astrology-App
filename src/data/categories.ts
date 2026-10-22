import type { SpecialtyId } from '../types/astrologer'

export type AstrologyCategory = {
  id: SpecialtyId
  name: string
  description: string
  icon: 'heart' | 'briefcase' | 'heart-pulse' | 'coins' | 'users' | 'sparkles'
  href: string
  filterLabel: string
}

export const astrologyCategories: AstrologyCategory[] = [
  {
    id: 'love',
    name: 'Love and Relationships',
    description: 'Clarity on compatibility, timing and communication in close bonds.',
    icon: 'heart',
    href: '/astrologers?specialty=love',
    filterLabel: 'Love',
  },
  {
    id: 'career',
    name: 'Career and Business',
    description: 'Guidance for professional choices, transitions and new ventures.',
    icon: 'briefcase',
    href: '/astrologers?specialty=career',
    filterLabel: 'Career',
  },
  {
    id: 'health',
    name: 'Health and Wellness',
    description: 'Support for lifestyle rhythms, recovery windows and balance.',
    icon: 'heart-pulse',
    href: '/astrologers?specialty=health',
    filterLabel: 'Health',
  },
  {
    id: 'finance',
    name: 'Finance and Wealth',
    description: 'Perspective on money cycles, planning and long-term stability.',
    icon: 'coins',
    href: '/astrologers?specialty=finance',
    filterLabel: 'Finance',
  },
  {
    id: 'marriage',
    name: 'Marriage and Family',
    description: 'Thoughtful counsel for family decisions, union and household life.',
    icon: 'users',
    href: '/astrologers?specialty=marriage',
    filterLabel: 'Marriage',
  },
  {
    id: 'kundali',
    name: 'Kundali Analysis',
    description: 'A structured reading of natal charts, dashas and planetary periods.',
    icon: 'sparkles',
    href: '/astrologers?specialty=kundali',
    filterLabel: 'Kundali',
  },
]
