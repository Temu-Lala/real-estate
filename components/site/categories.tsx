'use client'

import { Building2, Home, Store, Trees } from 'lucide-react'
import type { Property, PropertyQuery } from '@/lib/types'

// Each category is defined by a real search term. A card only renders when at
// least one live listing matches it, and clicking sets that same term — so the
// card count and the resulting filtered list are always consistent. No category
// is shown for inventory that does not exist.
const categories = [
  { title: 'Houses & Villas', term: 'villa', icon: Home, copy: 'Standalone villas, townhouses and family homes.' },
  { title: 'Apartments & Condominiums', term: 'apartment', icon: Building2, copy: 'Condominiums and serviced apartments.' },
  { title: 'Commercial & Offices', term: 'commercial', icon: Store, copy: 'Offices, retail space and commercial floors.' },
  { title: 'Land & Investment', term: 'land', icon: Trees, copy: 'Plots and land for development and investment.' },
]

function matches(property: Property, term: string): boolean {
  const haystack = `${property.propertyType} ${property.title}`.toLowerCase()
  return haystack.includes(term)
}

export function CategoriesSection({
  properties,
  setFilters,
}: {
  properties: Property[]
  setFilters: (next: PropertyQuery) => void
}) {
  const withCounts = categories
    .map((c) => ({ ...c, count: properties.filter((p) => matches(p, c.term)).length }))
    .filter((c) => c.count > 0)

  if (withCounts.length === 0) return null

  return (
    <section className="mx-auto max-w-[1440px] px-5 py-16 lg:px-10 lg:py-24">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-(--accent)">Browse by category</p>
        <h2 className="mt-3 font-serif text-4xl text-(--ink) sm:text-5xl">What are you looking for?</h2>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {withCounts.map((c) => (
          <button
            key={c.title}
            onClick={() => {
              setFilters({ q: c.term, sort: 'updated' })
              document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="group flex flex-col items-start rounded-2xl border border-(--line) bg-(--card) p-6 text-left transition hover:border-(--accent)/50 hover:shadow-[0_18px_44px_-30px_rgba(11,31,58,.5)]"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-(--chip) text-(--ink) transition group-hover:bg-(--accent) group-hover:text-[#0b1f3a]">
              <c.icon size={20} />
            </span>
            <h3 className="mt-5 font-serif text-xl text-(--ink)">{c.title}</h3>
            <p className="mt-2 text-sm leading-6 text-(--muted)">{c.copy}</p>
            <span className="mt-4 text-xs font-semibold uppercase tracking-wider text-(--accent)">
              {c.count} {c.count === 1 ? 'listing' : 'listings'}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
