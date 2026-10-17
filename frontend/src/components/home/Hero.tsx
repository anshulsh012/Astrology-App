import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass, Sparkles, Star } from 'lucide-react';

const stats = [
  { value: '500+', label: 'Verified astrologers' },
  { value: '25+', label: 'Languages supported' },
  { value: '4.9★', label: 'Average rating' },
];

const zodiacChips = ['♈ Aries', '♌ Leo', '♎ Libra', '♏ Scorpio', '♐ Sagittarius', '♓ Pisces'];

export default function Hero(): ReactNode {
  return (
    <section
      aria-labelledby="hero-heading"
      className="cosmic-bg relative overflow-hidden border-b border-white/5"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <span className="absolute left-[12%] top-[22%] h-1 w-1 rounded-full bg-gold-300/70" />
        <span className="absolute left-[72%] top-[18%] h-1.5 w-1.5 rounded-full bg-nebula-400/70" />
        <span className="absolute left-[85%] top-[60%] h-1 w-1 rounded-full bg-gold-300/50" />
        <span className="absolute left-[40%] top-[75%] h-1 w-1 rounded-full bg-white/40" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/5 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-gold-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Vedic wisdom · modern guidance
          </p>

          <h1
            id="hero-heading"
            className="font-display text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl"
          >
            Guidance written in the stars, <span className="gold-text">delivered today</span>.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
            Consult experienced astrologers for horoscopes, kundli reading, match-making, tarot and
            more — sessions from the comfort of your home.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/customer"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-500 px-7 py-3 text-sm font-semibold text-space-950 transition hover:brightness-110"
            >
              Book a consultation
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              to="/#services"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-7 py-3 text-sm font-medium text-white/80 transition hover:border-gold-400/50 hover:text-gold-300"
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              Explore services
            </Link>
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="font-display text-2xl text-gold-300">{stat.value}</dt>
                <dd className="mt-1 text-xs text-white/50">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative hidden lg:block">
          <div className="animate-float-slow rounded-3xl border border-white/10 bg-space-850/70 p-8 shadow-2xl shadow-nebula-500/20 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                Today&apos;s sky
              </span>
              <Star className="h-4 w-4 fill-gold-400 text-gold-400" aria-hidden="true" />
            </div>
            <p className="mt-6 font-display text-3xl text-white">Moon in Revati</p>
            <p className="mt-3 text-sm leading-relaxed text-white/55">
              A gentle evening for reflection, conversations and new beginnings. Placeholder copy —
              live horoscope content arrives in a later phase.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {['Fire', 'Earth', 'Air'].map((element) => (
                <span
                  key={element}
                  className="rounded-lg bg-nebula-500/15 py-2 text-center text-xs text-nebula-400 ring-1 ring-nebula-400/30"
                >
                  {element}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {zodiacChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}