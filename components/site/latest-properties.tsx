'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Property } from '@/lib/types'
import { PropertyCard, PropertySkeleton } from './property-card'
import { Reveal } from './reveal'

// Compact home-page preview of the collection: the newest listings first,
// capped at `count`, with a single "View all" exit to the full /properties screen.
export function LatestProperties({
  properties,
  loading,
  favorites,
  toggleFavorite,
  count = 5,
}: {
  properties: Property[]
  loading: boolean
  favorites: string[]
  toggleFavorite: (id: string) => void
  count?: number
}) {
  const latest = properties.slice(0, count)

  return (
    <section id="properties" className="mx-auto max-w-[1440px] px-5 py-16 lg:px-10">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.2em] text-(--accent)">New on the market</div>
          <h2 className="mt-2 font-serif text-5xl tracking-tight text-(--ink)">The latest listings.</h2>
        </div>
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 rounded-full border border-(--line) bg-(--card) px-5 py-3 text-sm font-semibold text-(--ink) transition hover:border-(--accent)"
        >
          View all properties <ArrowRight size={16} />
        </Link>
        </div>
      </Reveal>

      <div className="mt-8 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }, (_, i) => <PropertySkeleton key={i} />)
          : latest.map((property, i) => (
              <Reveal key={property.id} delay={Math.min(i, 4) * 0.06} y={20}>
                <PropertyCard
                  property={property}
                  liked={favorites.includes(property.id)}
                  toggle={() => toggleFavorite(property.id)}
                />
              </Reveal>
            ))}
      </div>

      {!loading && latest.length === 0 && (
        <div className="py-16 text-center text-(--muted)">No listings are published yet. Please check back soon.</div>
      )}
    </section>
  )
}
