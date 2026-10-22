import { Button } from '../components/ui/Button'

type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Coming next</p>
      <h1 className="mt-3 font-serif text-4xl text-cream sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-lavender">{description}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button to="/">Return home</Button>
        <Button to="/astrologers" variant="gold-outline">
          View sample astrologers
        </Button>
      </div>
    </section>
  )
}
