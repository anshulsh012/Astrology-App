import type { ReactNode } from 'react';
import {
  Compass,
  Hand,
  Hash,
  HeartHandshake,
  Layers,
  Scroll,
} from 'lucide-react';

const services = [
  {
    icon: Scroll,
    title: 'Kundli & horoscope',
    description:
      'Birth-chart reading and daily, weekly and yearly horoscopes curated by expert astrologers.',
  },
  {
    icon: HeartHandshake,
    title: 'Kundli matching',
    description:
      'Compatibility analysis for marriage based on traditional ashtakoot matching principles.',
  },
  {
    icon: Compass,
    title: 'Vastu shastra',
    description:
      'Guidance for home and workplace layouts to bring balance, clarity and positive energy.',
  },
  {
    icon: Layers,
    title: 'Tarot reading',
    description:
      'Intuitive card readings for questions about career, relationships and life decisions.',
  },
  {
    icon: Hash,
    title: 'Numerology',
    description:
      'Name, date-of-number and mobile-number numerology guidance for everyday choices.',
  },
  {
    icon: Hand,
    title: 'Palmistry',
    description:
      'Palm reading sessions covering work, health and relationship lines — video consultation.',
  },
];

export default function Services(): ReactNode {
  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="border-y border-white/5 bg-space-950/60"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-400/90">Services</p>
          <h2 id="services-heading" className="mt-3 font-display text-3xl text-white sm:text-4xl">
            Astrology services for every question
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/55 sm:text-base">
            Browse the categories we plan to support. Booking, pricing and scheduling activate in
            later phases.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <article
                key={service.title}
                className="group rounded-2xl border border-white/8 bg-space-850/50 p-7 transition hover:-translate-y-1 hover:border-nebula-400/50 hover:shadow-lg hover:shadow-nebula-500/10"
              >
                <span className="inline-flex rounded-xl bg-nebula-500/15 p-3 ring-1 ring-nebula-400/30">
                  <Icon className="h-5 w-5 text-gold-300" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-xl text-white">{service.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/55">{service.description}</p>
                <span className="mt-5 inline-block text-xs uppercase tracking-[0.18em] text-white/35 transition group-hover:text-gold-400/80">
                  Coming soon →
                </span>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}