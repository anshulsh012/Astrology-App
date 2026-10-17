import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, ShieldCheck, Users } from 'lucide-react';
import Layout from '../components/Layout';

const modules = [
  { icon: Users, title: 'Astrologer approvals', text: 'Review applications and manage profiles.' },
  { icon: BarChart3, title: 'Platform analytics', text: 'Bookings, revenue and engagement overview.' },
  { icon: ShieldCheck, title: 'Moderation', text: 'Reports, disputes and content moderation tools.' },
];

export default function AdminEntry(): ReactNode {
  return (
    <Layout>
      <section className="cosmic-bg min-h-[70vh] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-400/90">Admin entry</p>
          <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">Administration</h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
            Operations console for platform teams. This is a UI placeholder only —{' '}
            <strong className="text-gold-300">no authentication or admin logic</strong> is built in
            Phase 0, so no actions can be performed here yet.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {modules.map((item) => {
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