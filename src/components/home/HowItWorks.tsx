import { BookOpen, Calendar, MessageCircle, UserSearch } from 'lucide-react'
import { Section } from '../ui/Section'

const steps = [
  {
    title: 'Find an astrologer',
    copy: 'Search by name, language or specialty and shortlist voices that match your question.',
    icon: UserSearch,
  },
  {
    title: 'Review the profile',
    copy: 'Read experience, languages, areas of focus and indicative rates before you decide.',
    icon: BookOpen,
  },
  {
    title: 'Book a consultation',
    copy: 'Choose a time that works for you. Booking tools are not connected in this release.',
    icon: Calendar,
  },
  {
    title: 'Connect with the astrologer',
    copy: 'Join the session privately once accounts and scheduling are live.',
    icon: MessageCircle,
  },
]

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      className="mt-16 scroll-mt-24 sm:mt-20"
      eyebrow="The path"
      title="How it works"
      description="Four quiet steps from a question to a conversation."
    >
      <ol className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon
          return (
            <li
              key={step.title}
              className="relative flex h-full min-h-[13.5rem] flex-col rounded-2xl border border-line bg-card p-5"
            >
              <span className="font-serif text-sm text-gold">0{index + 1}</span>
              <span className="mt-3 grid h-10 w-10 place-items-center rounded-full border border-gold/30 text-gold">
                <Icon size={18} aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-serif text-xl text-cream">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-lavender">{step.copy}</p>
            </li>
          )
        })}
      </ol>
    </Section>
  )
}
