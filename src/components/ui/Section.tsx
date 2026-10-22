import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type SectionProps = {
  id?: string
  eyebrow?: string
  title?: string
  description?: string
  children: ReactNode
  className?: string
  headerClassName?: string
}

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
  headerClassName,
}: SectionProps) {
  return (
    <section id={id} className={cn('px-4 sm:px-6 lg:px-8', className)}>
      <div className="mx-auto max-w-6xl">
        {(eyebrow || title || description) && (
          <header className={cn('mb-10 max-w-2xl', headerClassName)}>
            {eyebrow ? (
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="font-serif text-3xl leading-tight text-cream sm:text-4xl">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-3 text-base leading-relaxed text-lavender">{description}</p>
            ) : null}
          </header>
        )}
        {children}
      </div>
    </section>
  )
}
