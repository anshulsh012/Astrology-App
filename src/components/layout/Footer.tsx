import { footerNav } from '../../data/navigation'
import { Logo } from '../brand/Logo'
import { Link } from 'react-router-dom'

function FooterColumn({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-gold">
        {title}
      </h2>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.to + link.label}>
            <Link
              to={link.to}
              className="text-sm text-lavender hover:text-cream focus-visible:text-cream"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-midnight">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-5 lg:px-8">
        <div className="lg:col-span-1">
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-lavender-muted">
            Private astrology consultations for love, career, health, family and kundali guidance.
          </p>
        </div>
        <FooterColumn title="Explore" links={footerNav.explore} />
        <FooterColumn title="Services" links={footerNav.services} />
        <FooterColumn title="Help" links={footerNav.help} />
        <FooterColumn title="Legal" links={footerNav.legal} />
      </div>
      <div className="border-t border-white/5">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-lavender-muted sm:px-6 lg:px-8">
          Nakshtra is a sample consultation interface. Profile details on this page are design
          placeholders and are not live practitioner records.
        </p>
      </div>
    </footer>
  )
}
