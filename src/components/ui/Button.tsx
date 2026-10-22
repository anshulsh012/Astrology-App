import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'gold-outline'
type ButtonSize = 'sm' | 'md'

type SharedProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: ReactNode
}

type ButtonAsButton = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
    to?: never
  }

type ButtonAsLink = SharedProps & {
  to: string
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'href'>

const styles: Record<ButtonVariant, string> = {
  primary:
    'bg-gold text-ink hover:bg-gold-soft focus-visible:bg-gold-soft disabled:bg-gold-dim disabled:text-ink/70',
  secondary:
    'bg-plum text-cream border border-line hover:border-gold/50 hover:text-gold-soft',
  ghost: 'bg-transparent text-cream hover:text-gold-soft hover:bg-white/5',
  'gold-outline':
    'bg-transparent text-gold border border-gold/45 hover:bg-gold/10 hover:border-gold',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-wide transition-colors duration-200 disabled:cursor-not-allowed'

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonAsButton | ButtonAsLink) {
  const classes = cn(base, styles[variant], sizes[size], className)

  if ('to' in rest && rest.to) {
    const { to, ...linkRest } = rest
    return (
      <Link to={to} className={classes} {...linkRest}>
        {children}
      </Link>
    )
  }

  const buttonRest = rest as ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <button type={buttonRest.type ?? 'button'} className={classes} {...buttonRest}>
      {children}
    </button>
  )
}
