'use client'

import { useState } from 'react'
import { Heart, X } from 'lucide-react'
import type { Property, PropertyQuery } from '@/lib/types'
import { PropertyCard, PropertySkeleton } from './property-card'
import { SearchFilters } from './search-filters'
import { Reveal } from './reveal'

const PURPOSE_LABEL: Record<string, string> = {
  Sale: 'For Sale',
  Rent: 'For Rent',
  Commercial: 'For Lease',
}

// Compact currency for filter chips so a long budget never dominates the row.
const compactPrice = (n: number) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'ETB',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)

export function PropertyCollection({
  properties,
  loading,
  error,
  filters,
  setFilters,
  favorites,
  toggleFavorite,
}: {
  properties: Property[]
  loading: boolean
  error: string
  filters: PropertyQuery
  setFilters: (next: PropertyQuery) => void
  favorites: string[]
  toggleFavorite: (id: string) => void
}) {
  const [savedOnly, setSavedOnly] = useState(false)
  const visible = savedOnly ? properties.filter((p) => favorites.includes(p.id)) : properties
  const set = (patch: Partial<PropertyQuery>) => setFilters({ ...filters, ...patch })

  // Every active filter becomes a removable chip, so a visitor can see exactly
  // what is narrowing the results and drop any single one in one tap.
  const chips: { key: string; label: string; onRemove: () => void }[] = []
  if (filters.listingType)
    chips.push({
      key: 'listingType',
      label: PURPOSE_LABEL[filters.listingType] ?? filters.listingType,
      onRemove: () => set({ listingType: undefined }),
    })
  if (filters.type) chips.push({ key: 'type', label: filters.type, onRemove: () => set({ type: undefined }) })
  if (filters.q) chips.push({ key: 'q', label: `“${filters.q}”`, onRemove: () => set({ q: undefined }) })
  if (filters.minPrice)
    chips.push({ key: 'minPrice', label: `Min ${compactPrice(filters.minPrice)}`, onRemove: () => set({ minPrice: undefined }) })
  if (filters.maxPrice)
    chips.push({ key: 'maxPrice', label: `Max ${compactPrice(filters.maxPrice)}`, onRemove: () => set({ maxPrice: undefined }) })
  if (filters.beds) chips.push({ key: 'beds', label: `${filters.beds}+ beds`, onRemove: () => set({ beds: undefined }) })
  if (filters.baths) chips.push({ key: 'baths', label: `${filters.baths}+ baths`, onRemove: () => set({ baths: undefined }) })

  const clearAll = () => setFilters({ sort: filters.sort })

  return (
    <section id="properties" className="mx-auto max-w-[1440px] px-5 py-10 lg:px-10 lg:py-14">
      {!savedOnly && <SearchFilters filters={filters} onChange={setFilters} />}

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[.14em] text-(--muted)">Active</span>
          {chips.map((chip) => (
          <Reveal
            key={chip.key}
            delay={0}
            y={10}
            amount={0}
            className="inline-flex"
          >
            <button
              onClick={chip.onRemove}
              aria-label={`Remove filter ${chip.label}`}
              className="group inline-flex items-center gap-1.5 rounded-full border border-(--line) bg-(--card) px-3 py-1.5 text-xs font-medium text-(--ink) transition-[border-color,color] hover:border-(--ink)/40 active:scale-[.97]"
            >
              {chip.label}
              <X size={13} className="text-(--muted) transition group-hover:text-(--ink)" />
            </button>
          </Reveal>
          ))}
          <button
            onClick={clearAll}
            aria-label="Clear all filters"
            className="ml-1 text-xs font-semibold text-(--accent) transition hover:text-(--ink)"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results toolbar: count on the left, saved-only toggle on the right. */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-(--line) pb-4">
        <p className="text-sm text-(--muted)" aria-live="polite">
          {loading ? (
            'Searching…'
          ) : (
            <>
              <span className="font-semibold text-(--ink)">{visible.length}</span>{' '}
              {visible.length === 1 ? 'property' : 'properties'}
            </>
          )}
        </p>
        <button
          onClick={() => setSavedOnly(!savedOnly)}
          aria-pressed={savedOnly}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
            savedOnly
              ? 'border-(--ink) bg-(--ink-solid) text-white'
              : 'border-(--line) bg-(--card) text-(--muted) hover:border-(--ink)/40'
          }`}
        >
          <Heart size={14} className={savedOnly ? 'fill-white' : ''} />
          Saved{favorites.length > 0 ? ` (${favorites.length})` : ''}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-8 rounded-xl bg-(--danger-bg) px-4 py-3 text-sm text-(--danger-fg)">
          {error}
        </p>
      )}

      {/* Cards here are intentionally NOT wrapped in Reveal: they remount on every
      filter change, so a scroll entrance would replay constantly and feel jarring. */}
      <div className="mt-8 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }, (_, i) => <PropertySkeleton key={i} />)
          : visible.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                liked={favorites.includes(property.id)}
                toggle={() => toggleFavorite(property.id)}
              />
            ))}
      </div>

      {!loading && visible.length === 0 && (
        <div className="py-20 text-center text-(--muted)">
          {savedOnly && favorites.length === 0
            ? 'You have not saved any homes yet. Tap the heart on a listing to keep it here.'
            : 'No properties match your search. Try widening the price range or clearing filters.'}
        </div>
      )}
    </section>
  )
}
