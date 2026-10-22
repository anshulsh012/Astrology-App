import { Compass } from 'lucide-react'
import { Button } from '../ui/Button'

export function DiscoveryPanel() {
  return (
    <section
      aria-labelledby="find-astrologer-heading"
      className="rounded-2xl border border-gold/35 bg-card p-6 shadow-card sm:p-8"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full border border-gold/30 bg-gold/10 text-gold">
        <Compass size={18} aria-hidden="true" />
      </span>
      <h2 id="find-astrologer-heading" className="mt-4 font-serif text-3xl text-cream sm:text-4xl">
        Find your astrologer
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-lavender sm:text-base">
        Explore the sample directory, or request a consultation with an approved astrologer. Sample
        profiles cannot be booked.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button to="/customer/book">Book a consultation</Button>
        <Button to="/astrologers" variant="gold-outline">
          Explore astrologers
        </Button>
      </div>
    </section>
  )
}
