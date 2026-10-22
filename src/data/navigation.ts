export type NavItem = {
  label: string
  to: string
}

export const primaryNav: NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Astrologers', to: '/astrologers' },
  { label: 'Services', to: '/services' },
  { label: 'About', to: '/about' },
  { label: 'Blog', to: '/blog' },
]

export const footerNav = {
  explore: [
    { label: 'Home', to: '/' },
    { label: 'Astrologers', to: '/astrologers' },
    { label: 'Services', to: '/services' },
    { label: 'About Nakshtra', to: '/about' },
    { label: 'Journal', to: '/blog' },
  ],
  services: [
    { label: 'Love and Relationships', to: '/astrologers?specialty=love' },
    { label: 'Career and Business', to: '/astrologers?specialty=career' },
    { label: 'Health and Wellness', to: '/astrologers?specialty=health' },
    { label: 'Finance and Wealth', to: '/astrologers?specialty=finance' },
    { label: 'Marriage and Family', to: '/astrologers?specialty=marriage' },
    { label: 'Kundali Analysis', to: '/astrologers?specialty=kundali' },
  ],
  help: [
    { label: 'How consultations work', to: '/#how-it-works' },
    { label: 'Search astrologers', to: '/astrologers' },
    { label: 'Account access', to: '/login' },
    { label: 'Create an account', to: '/register' },
  ],
  legal: [
    { label: 'Privacy', to: '/privacy' },
    { label: 'Terms', to: '/terms' },
  ],
}
