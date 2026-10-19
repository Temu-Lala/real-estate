'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Building2, Search, SlidersHorizontal } from 'lucide-react'
import type { Property, PropertyQuery } from '@/lib/types'
import { resolveMediaUrl } from '@/lib/api'

const tabs: { label: string; value: string }[] = [
  { label: 'Buy', value: 'Sale' },
  { label: 'Rent', value: 'Rent' },
  { label: 'Commercial', value: 'Commercial' },
]

const field =
  'h-11 w-full rounded-xl border border-(--line) bg-(--card) px-3 text-sm text-(--ink) outline-none focus:border-(--accent)'

export function Hero({
  properties,
  loading,
  startInquiry,
}: {
  properties: Property[]
  loading: boolean
  startInquiry: () => void
}) {
  const router = useRouter()
  const [local, setLocal] = useState<PropertyQuery>({})
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Distinct property types present in live inventory — powers the type select
  // so it never offers a category with zero listings.
  const types = Array.from(new Set(properties.map((p) => p.propertyType).filter(Boolean)))

  // Hero image: prefer a genuine landscape marketing shot (real property photos
  // are wider than tall) across live listings, so a square logo/screenshot never
  // hijacks the backdrop; fall back to any first gallery image; if there is no
  // media at all, show the navy gradient. Floor plans are layout drawings and
  // must never become the landing backdrop. Never stock/demo imagery.
  const galleryMedia = properties.flatMap((p) => p.media).filter((m) => m.kind !== 'floorplan')
  const heroMedia =
    galleryMedia.find((m) => m.width > 0 && m.height > 0 && m.width >= m.height * 1.2) ?? galleryMedia[0]
  const heroImage = heroMedia ? resolveMediaUrl(heroMedia.url) : null

  const set = (patch: Partial<PropertyQuery>) => setLocal((prev) => ({ ...prev, ...patch }))

  // Number of secondary filters set — badged on the mobile "Filters" toggle so a
  // collapsed panel never hides the fact that narrowing filters are active.
  const activeCount = [local.type, local.maxPrice, local.beds].filter(Boolean).length

  function runSearch() {
    // The full browse/filtering experience lives on its own /properties screen;
    // hand the hero query over as URL params so deep links and share-ability work.
    const q = new URLSearchParams()
    if (local.q) q.set('q', local.q)
    if (local.listingType) q.set('listingType', local.listingType)
    if (local.type) q.set('type', local.type)
    if (local.maxPrice) q.set('maxPrice', String(local.maxPrice))
    if (local.beds) q.set('beds', String(local.beds))
    const qs = q.toString()
    router.push(`/properties${qs ? `?${qs}` : ''}`)
  }

  function chooseTab(value: string) {
    setLocal((prev) => ({ ...prev, listingType: prev.listingType === value ? undefined : value }))
  }

  return (
    <section id="home" className="relative isolate overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-(--ink-solid)" />
      {heroImage && (
        <img src={heroImage} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-[#060f1c]/95 via-[#0b1f3a]/72 to-[#0b1f3a]/30" />

      <div className="relative mx-auto max-w-[1440px] px-5 pb-14 pt-20 lg:px-10 lg:pb-20 lg:pt-28">
        <div className="max-w-2xl text-white">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[.2em] text-white/85">
            <Building2 size={13} className="text-(--accent)" /> Premium Addis Ababa real estate
          </div>
          <h1 className="font-serif text-[clamp(2.6rem,6vw,5.2rem)] font-semibold leading-[1.02] tracking-tight">
            Find Your Dream Home in Addis Ababa.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/80">
            Buy, rent or invest in a curated selection of villas, apartments, offices and land — with transparent
            details and a personal advisor at every step.
          </p>
        </div>

        {/* Search card */}
        <div className="mt-10 rounded-2xl border border-white/15 bg-(--card)/95 p-4 shadow-[0_30px_60px_-30px_rgba(6,15,28,.7)] backdrop-blur sm:p-5">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => chooseTab('')}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition shrink-0 whitespace-nowrap ${
                !local.listingType ? 'bg-(--ink-solid) text-white' : 'bg-(--chip) text-(--muted) hover:text-(--ink)'
              }`}
            >
              All
            </button>
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => chooseTab(tab.value)}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition shrink-0 whitespace-nowrap ${
                  local.listingType === tab.value
                    ? 'bg-(--accent) text-[#0b1f3a]'
                    : 'bg-(--chip) text-(--muted) hover:text-(--ink)'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Primary search row — full-width input above a balanced two-button
              row on phones; a single inline row from the small breakpoint up
              (the wrapper collapses via sm:contents). */}
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-(--line) bg-(--card) px-3 focus-within:border-(--accent) sm:flex-1">
              <Search size={16} className="shrink-0 text-(--muted)" />
              <input
                value={local.q ?? ''}
                onChange={(e) => set({ q: e.target.value })}
                placeholder="Location (Bole, Kazanchis…)"
                aria-label="Location"
                className="size-full min-w-0 bg-transparent text-sm text-(--ink) outline-none"
              />
            </label>
            <div className="flex gap-2.5 sm:contents">
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
                className="relative flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-(--chip) px-3 text-sm font-semibold text-(--ink) sm:hidden"
              >
                <SlidersHorizontal size={16} />
                Filters
                {activeCount > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-(--accent) text-[11px] font-bold text-[#0b1f3a]">
                    {activeCount}
                  </span>
                )}
              </button>
              <button
                onClick={runSearch}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-(--accent) px-4 text-sm font-bold text-[#0b1f3a] transition hover:brightness-105 sm:flex-none sm:px-5"
              >
                <Search size={16} className="sm:hidden" /> <span className="hidden sm:inline">Search Properties</span>
                <span className="sm:hidden">Search</span>
              </button>
            </div>
          </div>

          {/* Secondary controls — collapsible on phones (only when open),
              always inline from the small breakpoint up. */}
          <div
            className={`${
              filtersOpen ? 'mt-3 grid grid-cols-2' : 'hidden'
            } gap-2.5 sm:mt-4 sm:grid sm:grid-cols-3`}
          >
            <select
              value={local.type ?? ''}
              onChange={(e) => set({ type: e.target.value })}
              aria-label="Property type"
              className={field}
            >
              <option value="">Any type</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={local.maxPrice ?? ''}
              onChange={(e) => set({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="Max budget (ETB)"
              aria-label="Maximum budget"
              className={field}
            />
            <select
              value={local.beds ?? ''}
              onChange={(e) => set({ beds: e.target.value ? Number(e.target.value) : undefined })}
              aria-label="Minimum bedrooms"
              className={`${field} col-span-2 sm:col-span-1`}
            >
              <option value="">Beds: any</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}+ beds
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/80">
          <span>
            {loading ? 'Loading…' : `${properties.length} live ${properties.length === 1 ? 'listing' : 'listings'}`}
          </span>
          <button onClick={startInquiry} className="inline-flex items-center gap-1.5 font-semibold text-white underline-offset-4 hover:underline">
            Talk to an advisor <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </section>
  )
}
