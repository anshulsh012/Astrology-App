import {
  Briefcase,
  Coins,
  Heart,
  HeartPulse,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { astrologyCategories, type AstrologyCategory } from '../../data/categories'
import { Section } from '../ui/Section'

const icons: Record<AstrologyCategory['icon'], LucideIcon> = {
  heart: Heart,
  briefcase: Briefcase,
  'heart-pulse': HeartPulse,
  coins: Coins,
  users: Users,
  sparkles: Sparkles,
}

export function CategoryGrid() {
  return (
    <Section
      id="categories"
      eyebrow="Guidance by path"
      title="Astrology categories"
      description="Start with the question that matters most. Each path opens the sample directory with that specialty selected."
    >
      <ul className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {astrologyCategories.map((category) => {
          const Icon = icons[category.icon]
          return (
            <li key={category.id} className="h-full">
              <Link
                to={category.href}
                className="group flex h-full min-h-[11.5rem] flex-col rounded-2xl border border-line bg-card p-5 transition-colors hover:border-gold/40"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full border border-gold/30 bg-gold/10 text-gold">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-serif text-2xl text-cream group-hover:text-gold-soft">
                  {category.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-lavender">{category.description}</p>
              </Link>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
