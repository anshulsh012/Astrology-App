import { Search } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { StarField } from '../ui/StarField'
import { ZodiacWheel } from './ZodiacWheel'

export function Hero() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    navigate(`/astrologers${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12 lg:px-8 lg:pb-20 lg:pt-14">
      <StarField />
      <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-12">
        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            Vedic counsel, privately held
          </p>
          <h1 className="mt-4 font-serif text-[2.15rem] leading-[1.12] text-cream sm:text-5xl lg:text-[3.25rem]">
            Find Guidance for a Brighter Tomorrow
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-lavender sm:text-lg">
            Speak with independent astrologers about love, career, health, family and kundali
            questions. Search a specialty, review a sample profile, then continue when accounts are
            connected.
          </p>

          <form
            onSubmit={handleSearch}
            className="mt-8 rounded-2xl border border-line bg-plum/55 p-2 sm:rounded-full sm:p-1.5"
            role="search"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lavender-muted"
                  aria-hidden="true"
                />
                <input
                  id="hero-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search an astrologer or specialty"
                  aria-label="Search astrologers or specialties"
                  className="h-12 w-full rounded-full bg-transparent py-3 pl-11 pr-4 text-sm text-cream placeholder:text-lavender-muted"
                />
              </div>
              <Button type="submit" className="h-12 shrink-0 px-6 sm:min-w-[8.5rem]">
                Search
              </Button>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button to="/astrologers" variant="gold-outline">
              Explore astrologers
            </Button>
            <p className="text-xs text-lavender-muted">Sample directory — not live listings</p>
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[280px] sm:max-w-[340px] lg:max-w-[420px]">
          <ZodiacWheel />
        </div>
      </div>
    </section>
  )
}
