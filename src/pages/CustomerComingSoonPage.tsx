import { Button } from '../components/ui/Button'

type CustomerComingSoonPageProps = {
  title: string
  description: string
}

export function CustomerComingSoonPage({ title, description }: CustomerComingSoonPageProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Coming soon</p>
      <h1 className="mt-3 font-serif text-4xl text-cream sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-lavender">{description}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button to="/customer">Back to dashboard</Button>
        <Button to="/astrologers" variant="gold-outline">
          Explore astrologers
        </Button>
      </div>
    </section>
  )
}
