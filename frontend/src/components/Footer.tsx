import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2, Moon, Sparkles } from 'lucide-react';
import { useHealth } from '../hooks/useHealth';

function ApiStatus(): ReactNode {
  const health = useHealth();

  if (health.phase === 'loading') {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-white/50" data-testid="api-status">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        Checking API…
      </span>
    );
  }

  if (health.phase === 'error') {
    return (
      <span
        className="inline-flex items-center gap-2 text-xs text-amber-300/90"
        data-testid="api-status"
        title={health.error}
      >
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        API offline — run `uvicorn app.main:app` in backend/
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-2 text-xs text-emerald-300/90"
      data-testid="api-status"
    >
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      API online ({health.data.status})
    </span>
  );
}

const columns = [
  {
    title: 'Explore',
    links: [
      { label: 'Services', to: '/#services' },
      { label: 'Featured astrologers', to: '/#astrologers' },
      { label: 'Customer entry', to: '/customer' },
    ],
  },
  {
    title: 'Astrologers',
    links: [
      { label: 'Astrologer entry', to: '/astrologer' },
      { label: 'Admin entry', to: '/admin' },
    ],
  },
];

export default function Footer(): ReactNode {
  return (
    <footer className="border-t border-white/5 bg-space-950">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-nebula-500/20 p-2 ring-1 ring-gold-400/40">
              <Sparkles className="h-4 w-4 text-gold-300" aria-hidden="true" />
            </span>
            <span className="font-display text-lg text-white">
              Nakshtra <span className="gold-text">Tak</span>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-white/50">
            A premium astrology consultation platform. Phase 0 foundation scaffold — content and
            features are placeholders.
          </p>
        </div>

        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold-400/80">
              {column.title}
            </h3>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-white/60 transition-colors hover:text-gold-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold-400/80">
            Status
          </h3>
          <ApiStatus />
          <p className="mt-4 flex items-center gap-1.5 text-xs text-white/40">
            <Moon className="h-3.5 w-3.5" aria-hidden="true" />
            Phase 0 — foundation only
          </p>
        </div>
      </div>

      <div className="border-t border-white/5 py-5">
        <p className="mx-auto max-w-7xl px-4 text-center text-xs text-white/40 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Nakshtra Tak. Astrology guidance is for entertainment and
          reflection purposes.
        </p>
      </div>
    </footer>
  );
}