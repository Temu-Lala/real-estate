'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Building2, Pause, Play, Search, SlidersHorizontal } from 'lucide-react'
import type { Property, PropertyQuery } from '@/lib/types'
import { resolveMediaUrl } from '@/lib/api'
import { Reveal } from './reveal'

const tabs: { label: string; value: string }[] = [
  { label: 'Buy', value: 'Sale' },
  { label: 'Rent', value: 'Rent' },
  { label: 'Commercial', value: 'Commercial' },
]

const field =
  'h-11 w-full rounded-xl border border-(--line) bg-(--card) px-3 text-sm text-(--ink) outline-none focus:border-(--accent)'

// How long each backdrop photo is held before advancing. Long enough to read the
// scene, short enough that the slow Ken Burns drift finishes before the swap.
const SLIDE_MS = 7000
const MAX_SLIDES = 6

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

  // Backdrop slideshow: genuine listing photography only (never stock). Landscape
  // shots lead because they cover a wide hero without awkward cropping, then the
  // largest frames next so the rotation never opens on a soft thumbnail. Floor plans
  // are layout drawings and must never appear as the landing backdrop. If there is
  // no media at all, the navy gradient shows instead.
  const slides = useMemo(() => {
    const gallery = properties.flatMap((p) => p.media).filter((m) => m.kind !== 'floorplan')
    const scored = gallery.map((m) => ({
      url: resolveMediaUrl(m.url),
      landscape: m.width > 0 && m.height > 0 && m.width >= m.height * 1.2,
      pixels: (m.width || 0) * (m.height || 0),
    }))
    scored.sort((a, b) => Number(b.landscape) - Number(a.landscape) || b.pixels - a.pixels)
    return Array.from(new Set(scored.map((s) => s.url))).slice(0, MAX_SLIDES)
  }, [properties])

  const [slide, setSlide] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [tabVisible, setTabVisible] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)

  // Respect the visitor's OS-level motion preference: no auto-advance, no drift.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Stop decoding/repainting a backdrop nobody is looking at
  useEffect(() => {
    const onVisibility = () => setTabVisible(document.visibilityState !== 'hidden')
    onVisibility()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Advance on a timer only while there is more than one frame, the visitor has not
  // paused it, and the tab is visible (a background interval would wake the device
  // for something no one can see).
  const rotating = slides.length > 1 && playing && tabVisible && !reducedMotion
  useEffect(() => {
    if (!rotating) return
    const id = window.setInterval(() => setSlide((i) => (i + 1) % slides.length), SLIDE_MS)
    return () => window.clearInterval(id)
  }, [rotating, slides.length])

  // Warm the next frame into cache so the crossfade never catches up with a download
  useEffect(() => {
    if (slides.length < 2) return
    const next = new Image()
    next.src = slides[(slide + 1) % slides.length]
  }, [slide, slides])

  // Clamp if the listing set changes underneath us (e.g. dashboard data refresh)
  useEffect(() => {
    setSlide((i) => (i >= slides.length ? 0 : i))
  }, [slides.length])

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
      {slides.length > 0 && (
        // Crossfading slides with a very slow settle from a slight over-zoom, so the
        // landing reads as moving photography rather than a static banner.
        <AnimatePresence>
          <motion.img
            key={slides[slide]}
            src={slides[slide]}
            alt=""
            aria-hidden
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.07 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            // The exit carries its own short transition: otherwise it inherits the 8s
            // Ken Burns duration below and AnimatePresence keeps the faded-out frame
            // mounted long after it stopped being visible.
            exit={reducedMotion ? { opacity: 0, transition: { duration: 0.6 } } : { opacity: 0, scale: 1.02, transition: { duration: 1.2, ease: 'easeInOut' } }}
            transition={{
              opacity: { duration: 1.2, ease: 'easeInOut' },
              scale: { duration: (SLIDE_MS / 1000) + 1.2, ease: 'linear' },
            }}
            className="absolute inset-0 size-full object-cover"
          />
        </AnimatePresence>
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-[#060f1c]/95 via-[#0b1f3a]/72 to-[#0b1f3a]/30" />

      {/* Slide controls: jump to any frame or stop the rotation (WCAG 2.2.2). Sits in
          the hero's empty top-right band so it never overlaps the heading or form. */}
      {slides.length > 1 && (
        <div className="absolute right-4 top-5 z-10 flex items-center gap-2 md:right-8 md:top-12">
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            aria-label={playing ? 'Pause background photos' : 'Resume background photos'}
            title={playing ? 'Pause photos' : 'Resume photos'}
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/25 text-white/80 backdrop-blur transition hover:border-white/60 hover:text-white active:scale-95"
          >
            {playing ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
          </button>
          <div className="flex items-center gap-1.5">
            {slides.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setSlide(i)}
                aria-label={`Show photo ${i + 1} of ${slides.length}`}
                aria-current={i === slide}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === slide ? 'w-6 bg-(--accent) md:w-7' : 'w-1.5 bg-white/35 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="relative mx-auto max-w-[1440px] px-5 pb-14 pt-20 lg:px-10 lg:pb-20 lg:pt-28">
        <div className="max-w-2xl text-white">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[.2em] text-white/85"
          >
            <Building2 size={13} className="text-(--accent)" /> Premium Addis Ababa real estate
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.14 }}
            className="font-serif text-[clamp(2.6rem,6vw,5.2rem)] font-semibold leading-[1.02] tracking-tight"
          >
            Find Your Dream Home in Addis Ababa.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.26 }}
            className="mt-5 max-w-xl text-base leading-7 text-white/80"
          >
            Buy, rent or invest in a curated selection of villas, apartments, offices and land — with transparent
            details and a personal advisor at every step.
          </motion.p>
        </div>

        {/* Search card */}
        <Reveal appear delay={0.34} y={22}>
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
        </Reveal>

        <Reveal appear delay={0.46} y={14}>
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/80">
          <span>
            {loading ? 'Loading…' : `${properties.length} live ${properties.length === 1 ? 'listing' : 'listings'}`}
          </span>
          <button onClick={startInquiry} className="inline-flex items-center gap-1.5 font-semibold text-white underline-offset-4 hover:underline">
            Talk to an advisor <ArrowRight size={15} />
          </button>
        </div>
        </Reveal>
      </div>
    </section>
  )
}
