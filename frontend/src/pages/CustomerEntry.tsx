import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Search, Sparkles, Star } from 'lucide-react';
import Layout from '../components/Layout';

const highlights = [
  {
    icon: Search,
    title: 'Discover astrologers',
    text: 'Filter by specialty, language and rating to find your guide.',
  },
  {
    icon: CalendarClock,
    title: 'Book a slot',
    text: 'Pick a time that works for you — chat, call or video in later phases.',
  },
  {
    icon: Star,
    title: 'Get clarity',
    text: 'Personal guidance for career, relationships, marriage and more.',
  },
];

export default function CustomerEntry(): ReactNode {
  return (
    <Layout>
      <section className="cosmic-bg min-h-[70vh] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-400/90">Customer entry</p>
          <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">
            Consult an astrologer
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
            This is a placeholder entry point. Search, booking, payments and live consultations are
            intentionally <strong className="text-gold-300">not implemented in Phase 0</strong>.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/8 bg-space-850/60 p-6 text-left"
                >
                  <span className="inline-flex rounded-xl bg-nebula-500/15 p-2.5 ring-1 ring-nebula-400/30">
                    <Icon className="h-4.5 w-4.5 text-gold-300" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 font-medium text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">{item.text}</p>
                </div>
              );
            })}
          </div>

          <p className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-space-850/70 px-4 py-2 text-xs text-white/50">
            <Sparkles className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" />
            Booking experience ships in Phase 1+
          </p>

          <div className="mt-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-gold-300"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}