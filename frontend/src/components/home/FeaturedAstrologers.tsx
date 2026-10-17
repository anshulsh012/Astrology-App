import type { ReactNode } from 'react';
import { BadgeCheck, MapPin, Star } from 'lucide-react';

/** Placeholder astrologer profiles — real data comes from the API in a later phase. */
const astrologers = [
  {
    name: 'Acharya Rohini',
    initials: 'AR',
    specialty: 'Vedic astrology & kundli',
    experience: '12 years',
    language: 'Hindi, English',
    gradient: 'from-nebula-500 to-nebula-400',
    rating: '4.9',
  },
  {
    name: 'Pandit Vivek S.',
    initials: 'VS',
    specialty: 'Kundli matching & muhurat',
    experience: '15 years',
    language: 'Hindi, Marathi',
    gradient: 'from-gold-500 to-gold-300',
    rating: '4.8',
  },
  {
    name: 'Meera Krishnan',
    initials: 'MK',
    specialty: 'Tarot & intuitive reading',
    experience: '8 years',
    language: 'English, Tamil',
    gradient: 'from-indigo-500 to-nebula-400',
    rating: '4.9',
  },
  {
    name: 'Dr. Ananya Rao',
    initials: 'AR',
    specialty: 'Numerology & vastu',
    experience: '10 years',
    language: 'English, Telugu',
    gradient: 'from-purple-500 to-nebula-500',
    rating: '4.7',
  },
];

export default function FeaturedAstrologers(): ReactNode {
  return (
    <section id="astrologers" aria-labelledby="astrologers-heading" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-400/90">Featured</p>
        <h2 id="astrologers-heading" className="mt-3 font-display text-3xl text-white sm:text-4xl">
          Meet our featured astrologers
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-white/55 sm:text-base">
          A curated preview of the experts joining the platform. Profiles below are placeholders —
          real listings and availability arrive with the next phase.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {astrologers.map((astrologer) => (
          <article
            key={astrologer.name}
            className="group rounded-2xl border border-white/8 bg-space-850/60 p-6 transition hover:border-gold-400/40 hover:bg-space-850"
          >
            <div className="flex items-center gap-4">
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${astrologer.gradient} font-display text-lg text-white ring-1 ring-white/20`}
                aria-hidden="true"
              >
                {astrologer.initials}
              </span>
              <div>
                <h3 className="flex items-center gap-1.5 font-medium text-white">
                  {astrologer.name}
                  <BadgeCheck className="h-4 w-4 text-gold-400" aria-label="Verified" />
                </h3>
                <p className="mt-0.5 text-xs text-white/50">{astrologer.specialty}</p>
              </div>
            </div>

            <dl className="mt-5 space-y-2 text-xs text-white/55">
              <div className="flex items-center justify-between">
                <dt>Experience</dt>
                <dd className="text-white/75">{astrologer.experience}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Languages</dt>
                <dd className="text-white/75">{astrologer.language}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Rating</dt>
                <dd className="inline-flex items-center gap-1 text-gold-300">
                  <Star className="h-3 w-3 fill-gold-400 text-gold-400" aria-hidden="true" />
                  {astrologer.rating}
                </dd>
              </div>
            </dl>

            <p className="mt-5 flex items-center gap-1.5 text-xs text-white/40">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Online sessions — coming soon
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}