import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import Layout from '../components/Layout';
import Hero from '../components/home/Hero';
import FeaturedAstrologers from '../components/home/FeaturedAstrologers';
import Services from '../components/home/Services';

export default function LandingPage(): ReactNode {
  return (
    <Layout>
      <Hero />
      <FeaturedAstrologers />
      <Services />

      <section aria-labelledby="cta-heading" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="cosmic-bg relative overflow-hidden rounded-3xl border border-gold-400/25 px-6 py-14 text-center sm:px-12">
          <Sparkles className="mx-auto h-7 w-7 text-gold-400" aria-hidden="true" />
          <h2 id="cta-heading" className="mt-5 font-display text-3xl text-white sm:text-4xl">
            Ready to ask the stars?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
            The consultation flow lands in a future phase. For now, explore the placeholder entry
            points built for customers, astrologers and administrators.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/customer"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-500 px-7 py-3 text-sm font-semibold text-space-950 transition hover:brightness-110"
            >
              Customer entry
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              to="/astrologer"
              className="inline-flex items-center rounded-full border border-white/15 px-7 py-3 text-sm font-medium text-white/80 transition hover:border-gold-400/50 hover:text-gold-300"
            >
              Astrologer entry
            </Link>
            <Link
              to="/admin"
              className="inline-flex items-center rounded-full border border-white/15 px-7 py-3 text-sm font-medium text-white/80 transition hover:border-gold-400/50 hover:text-gold-300"
            >
              Admin entry
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}