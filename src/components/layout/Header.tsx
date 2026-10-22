import { Menu, Search, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { primaryNav } from '../../data/navigation'
import { cn } from '../../lib/cn'
import { roleArea } from '../../services/auth'
import { Logo } from '../brand/Logo'
import { Button } from '../ui/Button'

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { status, user, signOut } = useAuth()
  const [openPath, setOpenPath] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const open = openPath === location.pathname
  const menuId = useId()
  const signedIn = status === 'authenticated' && user

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      navigate('/', { replace: true })
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  const accountControls = signedIn ? (
    <>
      <NavLink
        to={roleArea(user.role)}
        className="max-w-[10rem] truncate rounded-full px-3 py-2 text-sm text-lavender hover:text-cream"
      >
        {user.email}
      </NavLink>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={signingOut}
        onClick={() => {
          void handleSignOut()
        }}
      >
        {signingOut ? 'Signing out…' : 'Log out'}
      </Button>
    </>
  ) : (
    <>
      <Button to="/login" variant="ghost" size="sm">
        Login
      </Button>
      <Button to="/register" size="sm">
        Sign Up
      </Button>
    </>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-full px-3.5 py-2 text-sm text-lavender transition-colors hover:text-cream',
                  isActive && 'text-gold',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <NavLink
            to="/astrologers"
            className="grid h-10 w-10 place-items-center rounded-full text-lavender hover:bg-white/5 hover:text-cream"
            aria-label="Open astrologer directory"
          >
            <Search size={18} />
          </NavLink>
          <div className="hidden items-center gap-2 sm:flex">{accountControls}</div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full text-cream hover:bg-white/5 lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpenPath(open ? null : location.pathname)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open ? (
        <div id={menuId} className="border-t border-line bg-midnight px-4 py-5 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-3 text-base text-lavender hover:bg-white/5 hover:text-cream',
                    isActive && 'text-gold',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:hidden">{accountControls}</div>
        </div>
      ) : null}
    </header>
  )
}
