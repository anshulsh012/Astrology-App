import { astrologyCategories } from '../data/categories'
import { Button } from '../components/ui/Button'
import { Section } from '../components/ui/Section'

export function ServicesPage() {
  return (
    <Section
      className="py-16"
      eyebrow="Offerings"
      title="Consultation services"
      description="Each path describes the kind of conversation you can request. Booking is not live in this stage. Use a category to open matching sample profiles."
    >
      <ul className="grid gap-5">
        {astrologyCategories.map((category) => (
          <li
            key={category.id}
            id={category.id}
            className="scroll-mt-24 rounded-2xl border border-line bg-card p-6"
          >
            <h2 className="font-serif text-2xl text-cream">{category.name}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-lavender">
              {category.description}
            </p>
            <div className="mt-4">
              <Button to={category.href} variant="gold-outline" size="sm">
                View sample astrologers
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
