import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Sparkles, X } from 'lucide-react';
import AuthLinks from './AuthLinks';

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Services', to: '/#services' },
  { label: 'Astrologers', to: '/#astrologers' },
];

export default function Header(): ReactNode {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-space-900/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Nakshtra Tak home">
          <span className="rounded-full bg-nebula-500/20 p-2 ring-1 ring-gold-400/40">
            <Sparkles className="h-4 w-4 text-gold-300" aria-hidden="true" />
          </span>
          <span className="font-display text-lg tracking-wide text-white">
            Nakshtra <span className="gold-text">Tak</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              className={({ isActive }) =>
                `text-sm transition-colors ${
                  isActive && link.to === '/'
                    ? 'text-gold-300'
                    : 'text-white/70 hover:text-gold-300'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <Link
            to="/astrologer"
            className="text-sm text-white/70 transition-colors hover:text-gold-300"
          >
            For Astrologers
          </Link>
          <AuthLinks />
        </nav>

        <button
          type="button"
          className="rounded-md p-2 text-white/70 transition hover:bg-white/5 hover:text-white md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Mobile navigation"
          className="flex flex-col gap-1 border-t border-white/5 bg-space-900/95 px-4 py-3 md:hidden"
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-gold-300"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/astrologer"
            onClick={() => setOpen(false)}
            className="rounded-md px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-gold-300"
          >
            For Astrologers
          </Link>
          <Link
            to="/customer"
            onClick={() => setOpen(false)}
            className="mt-1 rounded-full border border-gold-400/60 bg-gold-400/10 px-4 py-2 text-center text-sm font-medium text-gold-300"
          >
            Book Consultation
          </Link>
        </nav>
      )}
    </header>
  );
}