'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Property, PropertyQuery } from '@/lib/types'
import { api } from '@/lib/api'
import { trackSearch } from '@/lib/track'
import { useFavorites } from '@/lib/use-favorites'
import { SiteHeader } from '@/components/site/site-header'
import { PropertyCollection } from '@/components/site/property-collection'
import { CategoriesSection } from '@/components/site/categories'
import { NeighborhoodsSection } from '@/components/site/neighborhoods'
import { InquiryDialog } from '@/components/site/inquiry-dialog'
import { SiteFooter } from '@/components/site/site-footer'

// Deep links from the home hero (/properties?listingType=Sale&q=Bole…) become
// the initial filter set. Parsed after mount so server and first client render
// stay identical (avoids a hydration mismatch), then a single refetch applies them.
function filtersFromSearch(search: string): PropertyQuery | null {
  const p = new URLSearchParams(search)
  const next: PropertyQuery = {}
  const str = (k: string) => p.get(k) || undefined
  next.q = str('q')
  next.listingType = str('listingType')
  next.type = str('type')
  next.sort = (str('sort') as PropertyQuery['sort']) ?? 'updated'
  const num = (k: string) => (p.get(k) ? Number(p.get(k)) : undefined)
  next.minPrice = num('minPrice')
  next.maxPrice = num('maxPrice')
  next.beds = num('beds')
  next.baths = num('baths')
  const touched = Object.values(next).some((v) => v !== undefined && v !== '' && v !== 'updated')
  return touched ? (next as PropertyQuery) : null
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filters, setFilters] = useState<PropertyQuery>({ sort: 'updated' })
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const { favorites, toggleFavorite } = useFavorites()
  // Only log a search when the typed term actually changes, so debounced refetches
  // (and filter tweaks while a term is present) don't spam the analytics table.
  const lastTrackedQuery = useRef('')

  // Apply any inbound query params once, after mount.
  useEffect(() => {
    const inbound = filtersFromSearch(window.location.search)
    if (inbound) setFilters(inbound)
  }, [])

  // Debounced server-side search: refetch shortly after the last filter change.
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      api
        .listProperties(filters)
        .then((data) => {
          setProperties(data)
          setLoadError('')
          const term = (filters.q ?? '').trim().toLowerCase()
          if (term && term !== lastTrackedQuery.current) {
            lastTrackedQuery.current = term
            trackSearch(term, data.length)
          } else if (!term) {
            lastTrackedQuery.current = ''
          }
        })
        .catch(() => setLoadError('Property listings are temporarily unavailable. Please refresh in a moment.'))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [filters])

  // Keep the address bar in sync with the active filters (replaceState, so no
  // navigation or refetch is triggered). This makes deep links shareable and a
  // reload land on exactly what the visitor is viewing — removing a chip or
  // clearing filters updates the URL, not just the in-memory state.
  useEffect(() => {
    const p = new URLSearchParams()
    if (filters.q) p.set('q', filters.q)
    if (filters.listingType) p.set('listingType', filters.listingType)
    if (filters.type) p.set('type', filters.type)
    if (filters.minPrice) p.set('minPrice', String(filters.minPrice))
    if (filters.maxPrice) p.set('maxPrice', String(filters.maxPrice))
    if (filters.beds) p.set('beds', String(filters.beds))
    if (filters.baths) p.set('baths', String(filters.baths))
    if (filters.sort && filters.sort !== 'updated') p.set('sort', filters.sort)
    const qs = p.toString()
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    window.history.replaceState(null, '', url)
  }, [filters])

  const startInquiry = () => setInquiryOpen(true)

  return (
    <main className="min-h-screen bg-(--bg) text-(--body)">
      <SiteHeader savedCount={favorites.length} startInquiry={startInquiry} />

      {/* Screen intro */}
      <div className="border-b border-(--line) bg-(--bg-soft)">
        <div className="mx-auto max-w-[1440px] px-5 py-12 lg:px-10">
          <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-xs text-(--muted) sm:flex">
            <Link href="/" className="transition hover:text-(--ink)">
              Home
            </Link>
            <span aria-hidden>/</span>
            <span className="text-(--ink)/70">Properties</span>
          </nav>
          <div className="mt-4 text-xs font-bold uppercase tracking-[.2em] text-(--accent)">Browse</div>
          <h1 className="mt-3 font-serif text-5xl tracking-tight text-(--ink)">All properties</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-(--muted)">
            Search the full Platinum collection — filter by purpose, type, budget and location to find the right home.
          </p>
        </div>
      </div>

      <PropertyCollection
        properties={properties}
        loading={loading}
        error={loadError}
        filters={filters}
        setFilters={setFilters}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
      />

      {/* Data-driven browse aids (render only when real listings back them) */}
      <CategoriesSection properties={properties} setFilters={setFilters} />
      <NeighborhoodsSection properties={properties} setFilters={setFilters} />

      <SiteFooter />

      {inquiryOpen && <InquiryDialog close={() => setInquiryOpen(false)} property={null} />}
    </main>
  )
}
