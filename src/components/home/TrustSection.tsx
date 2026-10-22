import { BadgeCheck, LockKeyhole, Scale } from 'lucide-react'
import { Section } from '../ui/Section'

const pillars = [
  {
    title: 'Profile verification',
    copy: 'Practitioner pages will show how identity and credentials are reviewed before a listing is published. Until that process is live, every card is labelled as sample data.',
    icon: BadgeCheck,
  },
  {
    title: 'Transparent pricing',
    copy: 'Indicative rates appear on each profile. There is no live billing in this milestone; later charges will follow the published per-minute figure.',
    icon: Scale,
  },
  {
    title: 'Secure account access',
    copy: 'Login and registration talk to the FastAPI session API. A valid HttpOnly cookie is set only when the backend accepts the request.',
    icon: LockKeyhole,
  },
]

export function TrustSection() {
  return (
    <Section
      id="trust"
      className="mt-16 sm:mt-20"
      eyebrow="How we work"
      title="Clarity before you speak"
      description="Nakshtra is being built as a private consultation space. The notes below describe intended safeguards, not live claims."
    >
      <ul className="grid items-stretch gap-4 md:grid-cols-3">
        {pillars.map((pillar) => {
          const Icon = pillar.icon
          return (
            <li key={pillar.title} className="flex h-full min-h-[14rem] flex-col rounded-2xl border border-line bg-violet p-6">
              <span className="grid h-10 w-10 place-items-center rounded-full border border-gold/30 text-gold">
                <Icon size={18} aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-serif text-2xl text-cream">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-lavender">{pillar.copy}</p>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
