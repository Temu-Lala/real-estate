'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  Link2,
  Mail,
  MapPin,
  Maximize2,
  MessageCircle,
  Phone,
  Ruler,
  X,
} from 'lucide-react'
import type { Media, Property } from '@/lib/types'
import { ApiError, api, resolveMediaUrl } from '@/lib/api'
import {
  PLACEHOLDER_IMAGE,
  formatFriendlyDate,
  formatLocation,
  formatNumber,
  formatPrice,
  formatPricePerSqm,
  formatRoomSize,
  squareMeters,
} from '@/lib/format'
import { useFavorites } from '@/lib/use-favorites'
import { PropertyCard } from './property-card'
import { InquiryDialog } from './inquiry-dialog'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { Reveal, RevealItem } from './reveal'
import { MapView, hasValidCoordinates } from './map-view'
import { CONTACT, telHref } from '@/lib/site-contact'
import { trackGalleryOpen, trackInquiryOpen, trackPlanOpen, trackPropertyView } from '@/lib/track'

type ImageView = { url: string; alt: string; width: number; height: number }

// Agency contact facts come from the shared source of truth (no fabricated
// individual agent profiles, which we can't substantiate from listing data).
const AGENCY = {
  name: CONTACT.agency,
  desk: CONTACT.desk,
  phoneDisplay: CONTACT.phoneDisplay,
  phoneHref: telHref,
  whatsapp: CONTACT.phoneE164,
  email: CONTACT.email,
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Standard marketplace estimator: 30-year fixed, 20% down, 6.5% APR.
function monthlyEstimate(price: number): string {
  if (price <= 0) return '—'
  const principal = price * 0.8
  const r = 0.065 / 12
  const n = 360
  const payment = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  return formatPrice(Math.round(payment))
}

function toImageView(m: Media, fallbackAlt: string): ImageView {
  return { url: resolveMediaUrl(m.url), width: m.width, height: m.height, alt: m.alt || fallbackAlt }
}

// Consistent premium section heading: gold eyebrow + serif title + hairline rule.
// Lifted on scroll so every section of the page shares one entrance rhythm.
function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <Reveal>
      <div className="flex items-end justify-between gap-4 border-b border-(--line) pb-3">
        <div className="min-w-0">
          {eyebrow && <div className="text-[11px] font-bold uppercase tracking-[.22em] text-(--accent)">{eyebrow}</div>}
          <h2 className="mt-1 font-serif text-[1.75rem] leading-tight tracking-tight text-(--ink)">{title}</h2>
        </div>
        {action}
      </div>
    </Reveal>
  )
}

export function PropertyDetail({ slug }: { slug: string }) {
  const [property, setProperty] = useState<Property | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [index, setIndex] = useState(0)
  const [similar, setSimilar] = useState<Property[]>([])
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [viewer, setViewer] = useState<{ images: ImageView[]; i: number } | null>(null)
  const { favorites, toggleFavorite, isFavorite } = useFavorites()

  useEffect(() => {
    let active = true
    setState('loading')
    api
      .getProperty(slug)
      .then((data) => {
        if (!active) return
        setProperty(data)
        setIndex(0)
        setState('ready')
        // Record one anonymous listing view for the admin analytics dashboard.
        trackPropertyView(data.id)
      })
      .catch((error) => {
        if (!active) return
        setState(error instanceof ApiError && error.status === 404 ? 'missing' : 'error')
      })
    return () => {
      active = false
    }
  }, [slug])

  useEffect(() => {
    if (!property) return
    let active = true
    api
      .listProperties()
      .then((all) => {
        if (!active) return
        setSimilar(
          all
            .filter(
              (p) =>
                p.id !== property.id &&
                (p.propertyType === property.propertyType || p.address?.city === property.address?.city),
            )
            .slice(0, 3),
        )
      })
      .catch(() => active && setSimilar([]))
    return () => {
      active = false
    }
  }, [property])

  // Record an inquiry-open intent each time the contact dialog is opened.
  useEffect(() => {
    if (inquiryOpen && property) trackInquiryOpen(property.id)
  }, [inquiryOpen, property])

  // Full-screen viewer (photos or floor plans): Esc closes, arrows navigate,
  // scroll is locked while open. Cycles within whichever set was opened.
  useEffect(() => {
    if (!viewer) return
    const total = viewer.images.length
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setViewer(null)
      else if (event.key === 'ArrowRight') setViewer((v) => (v ? { ...v, i: (v.i + 1) % total } : v))
      else if (event.key === 'ArrowLeft') setViewer((v) => (v ? { ...v, i: (v.i - 1 + total) % total } : v))
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [viewer])

  if (state === 'loading') {
    return (
      <main className="min-h-screen bg-(--bg)">
        <SiteHeader />
        <div className="mx-auto max-w-[1280px] animate-pulse px-5 py-16 lg:px-10">
          <div className="h-6 w-48 rounded bg-(--chip)" />
          <div className="mt-6 h-[440px] rounded-[24px] bg-(--chip)" />
          <div className="mt-8 h-10 w-2/3 rounded bg-(--chip)" />
          <div className="mt-4 h-6 w-1/2 rounded bg-(--chip)" />
        </div>
      </main>
    )
  }

  if (state === 'missing' || state === 'error' || !property) {
    return (
      <main className="min-h-screen bg-(--bg)">
        <SiteHeader />
        <div className="mx-auto max-w-[720px] px-5 py-28 text-center">
          <h1 className="font-serif text-5xl text-(--ink)">
            {state === 'missing' ? 'This listing is no longer available.' : 'We could not load this listing.'}
          </h1>
          <p className="mt-4 text-sm text-(--muted)">
            {state === 'missing'
              ? 'It may have been sold, withdrawn, or the address is incorrect.'
              : 'Property data is temporarily unreachable. Please try again shortly.'}
          </p>
          <Link
            href="/properties"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-(--ink-solid) px-6 py-3 text-sm font-semibold text-white"
          >
            <ArrowLeft size={15} /> Back to all properties
          </Link>
        </div>
      </main>
    )
  }

  // Split media into the marketing gallery and the floor-plan set. Every image
  // in either group opens the same full-screen viewer.
  const gallery = property.media.filter((m) => m.kind !== 'floorplan').map((m) => toImageView(m, property.title))
  const plans = property.media.filter((m) => m.kind === 'floorplan').map((m) => toImageView(m, 'Floor plan'))
  const images: ImageView[] = gallery.length > 0 ? gallery : [{ url: PLACEHOLDER_IMAGE, alt: property.title, width: 0, height: 0 }]
  const liked = isFavorite(property.id)

  // Buyer-facing purpose. Derived only from real fields; "Sold" reflects the
  // actual listing state, "Verified" is never implied because we don't model it.
  const isSold = Boolean((property as { isSold?: boolean }).isSold)
  const purpose = isSold
    ? 'Sold'
    : property.listingType === 'Rent'
      ? 'For Rent'
      : property.listingType === 'Commercial'
        ? 'For Lease'
        : 'For Sale'

  const city = property.address?.city?.trim() || ''

  // Photo-led mosaic: a large hero tile + up to two supporting tiles on the
  // right (the second carries a "+N photos" overlay when the set is longer).
  const rightTiles = images.slice(1, 3)
  const extraCount = Math.max(0, images.length - 3)
  const openGalleryAt = (i: number) => {
    if (gallery.length > 0) trackGalleryOpen(property.id)
    setViewer({ images, i: Math.min(i, images.length - 1) })
  }
  const openPlan = (i: number) => {
    if (plans.length > 0) trackPlanOpen(property.id)
    setViewer({ images: plans, i })
  }

  const perSqm = formatPricePerSqm(property.price, property.squareFeet)
  // Real-world room schedule: only rows that carry a genuine name or size, with
  // bare numeric sizes expanded to the platform's unit pair (sq ft + m²).
  const roomRows = property.rooms
    .map((room) => ({ ...room, sizeLabel: formatRoomSize(room.size) }))
    .filter((room) => room.name?.trim() || room.sizeLabel)
  const areaRow = (sqft: number) => {
    if (sqft <= 0) return ''
    const m2 = squareMeters(sqft)
    return m2 > 0 ? `${formatNumber(sqft)} sq ft · ${formatNumber(m2)} m²` : `${formatNumber(sqft)} sq ft`
  }
  const floorAreaShort =
    property.squareFeet > 0
      ? squareMeters(property.squareFeet) > 0
        ? `${formatNumber(squareMeters(property.squareFeet))} m²`
        : `${formatNumber(property.squareFeet)} sq ft`
      : '—'

  const specRows: { label: string; value: string }[] = [
    { label: 'Listing status', value: purpose },
    { label: 'Property type', value: property.propertyType || '' },
    { label: 'Bedrooms', value: property.bedrooms > 0 ? String(property.bedrooms) : '' },
    { label: 'Bathrooms', value: property.bathrooms > 0 ? String(property.bathrooms) : '' },
    { label: 'Floor area', value: areaRow(property.squareFeet) },
    { label: 'Plot / land area', value: areaRow(property.lotSquareFeet) },
    {
      label: 'Furnishing',
      value: property.furnishing && property.furnishing !== 'Not specified' ? property.furnishing : '',
    },
    { label: 'Tenure', value: property.tenure && property.tenure !== 'Not specified' ? property.tenure : '' },
    {
      label: 'Availability',
      value: property.availability && property.availability !== 'Not specified' ? property.availability : '',
    },
    { label: 'Available from', value: property.availableFrom ? formatFriendlyDate(property.availableFrom) : '' },
    { label: 'Year built', value: property.yearBuilt ? String(property.yearBuilt) : '' },
    { label: 'Price per m²', value: perSqm !== '—' ? perSqm : '' },
    { label: 'Last updated', value: formatDate(property.updatedAt) },
  ].filter((r) => r.value)

  const waHref = `https://wa.me/${AGENCY.whatsapp}?text=${encodeURIComponent(
    `Hello ${AGENCY.desk}, I'm interested in “${property.title}”. Could we arrange a viewing?`,
  )}`
  const mailHref = `mailto:${AGENCY.email}?subject=${encodeURIComponent(`Enquiry: ${property.title}`)}&body=${encodeURIComponent(
    `I'd like more information about “${property.title}” (${property.slug}).`,
  )}`
  const reportHref = `mailto:${AGENCY.email}?subject=${encodeURIComponent(`Report listing: ${property.title}`)}&body=${encodeURIComponent(
    `Listing: ${property.title} (${property.slug})\nWhat would you like us to know?`,
  )}`
  const coordsValid = hasValidCoordinates(property.coordinates)
  const mapUrl = coordsValid
    ? `https://www.google.com/maps/search/?api=1&query=${property.coordinates.lat},${property.coordinates.lng}`
    : null

  const viewerImage = viewer ? viewer.images[Math.min(viewer.i, viewer.images.length - 1)] : null

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (http / permissions) — no-op.
    }
  }

  return (
    <main className="min-h-screen bg-(--bg) pb-24 text-(--body) lg:pb-0">
      <SiteHeader savedCount={favorites.length} startInquiry={() => setInquiryOpen(true)} />

      <div className="mx-auto max-w-[1280px] px-5 py-6 lg:px-10 lg:py-10">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between gap-3">
          <nav
            aria-label="Breadcrumb"
            className="hidden min-w-0 flex-1 items-center gap-2 overflow-hidden text-xs text-(--muted) sm:flex"
          >
            <Link href="/" className="shrink-0 transition hover:text-(--ink)">
              Home
            </Link>
            <span aria-hidden className="shrink-0">
              /
            </span>
            <Link href="/properties" className="shrink-0 transition hover:text-(--ink)">
              Properties
            </Link>
            {property.propertyType && (
              <span className="hidden min-w-0 items-center gap-2 sm:flex">
                <span aria-hidden>/</span>
                <Link href="/properties" className="max-w-[200px] truncate transition hover:text-(--ink)">
                  {property.propertyType}
                </Link>
              </span>
            )}
            {city && (
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden>/</span>
                <span className="min-w-0 truncate text-(--ink)/70">{city}</span>
              </span>
            )}
          </nav>
          <a href={reportHref} className="ml-auto shrink-0 text-xs text-(--muted) transition hover:text-(--ink)">
            Report this listing
          </a>
        </div>

        {/* Title header */}
        <Reveal appear y={16}>
          <header className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] ${
                isSold ? 'bg-(--danger-fg) text-white' : 'bg-(--ink-solid) text-white'
              }`}
            >
              {purpose}
            </span>
            {property.propertyType && (
              <span className="rounded-full border border-(--line) bg-(--card) px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-(--muted)">
                {property.propertyType}
              </span>
            )}
            {property.availability && property.availability !== 'Not specified' && (
              <span className="rounded-full bg-(--accent) px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#0b1f3a]">
                {property.availability}
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div className="min-w-0">
              <h1 className="max-w-4xl font-serif text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-tight text-(--ink)">
                {property.title}
              </h1>
              <div className="mt-3 flex items-center gap-1.5 text-sm text-(--muted)">
                <MapPin size={15} className="text-(--accent)" /> {formatLocation(property)}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[11px] font-bold uppercase tracking-[.2em] text-(--muted)">{isSold ? 'Sold for' : 'Guide price'}</div>
              <div className="mt-1.5 font-serif text-[2.1rem] leading-none text-(--ink)">{formatPrice(property.price)}</div>
              <div className="mt-2 text-xs text-(--muted)">
                {perSqm !== '—' ? `${perSqm} / m² · ` : ''}Est. {monthlyEstimate(property.price)}/mo
              </div>
            </div>
          </div>
          </header>
        </Reveal>

        {/* Photo-led gallery */}
        <Reveal appear delay={0.1} y={20}>
          <section aria-label="Photo gallery" className="mt-8">
          {images.length === 1 ? (
            <button
              type="button"
              onClick={() => openGalleryAt(0)}
              aria-label="Open photo full screen"
              className="group relative block aspect-[16/9] w-full cursor-zoom-in overflow-hidden rounded-[24px] bg-(--chip)"
            >
              <img src={images[0].url} alt={property.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
              <span className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-[#0b1f3a]/70 text-white backdrop-blur">
                <Maximize2 size={17} />
              </span>
            </button>
          ) : (
            <>
              {/* Desktop mosaic */}
              <div className="hidden gap-2 sm:grid sm:h-[440px] sm:grid-cols-3 sm:grid-rows-2">
                <button
                  type="button"
                  onClick={() => openGalleryAt(0)}
                  aria-label="Open photo full screen"
                  className="group relative col-span-2 row-span-2 cursor-zoom-in overflow-hidden rounded-2xl bg-(--chip)"
                >
                  <img src={images[0].url} alt={property.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  <span className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-[#0b1f3a]/70 text-white backdrop-blur transition group-hover:bg-[#0b1f3a]/90">
                    <Maximize2 size={17} />
                  </span>
                  <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-[#0b1f3a]/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                    <Camera size={13} /> {images.length} photos
                  </span>
                </button>
                {rightTiles.map((photo, idx) => {
                  const gi = idx + 1
                  const isLast = idx === rightTiles.length - 1
                  return (
                    <button
                      key={photo.url + gi}
                      type="button"
                      onClick={() => openGalleryAt(gi)}
                      aria-label={`Open photo ${gi + 1}`}
                      className={`group relative cursor-zoom-in overflow-hidden rounded-2xl bg-(--chip) ${images.length === 2 ? 'row-span-2' : ''}`}
                    >
                      <img src={photo.url} alt={photo.alt} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                      {isLast && extraCount > 0 && (
                        <span className="absolute inset-0 grid place-items-center bg-[#0b1f3a]/60 text-sm font-bold text-white backdrop-blur-[1px]">
                        +{extraCount} more
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Mobile: single lead image + horizontal thumbnail rail */}
              <div className="sm:hidden">
                <button
                  type="button"
                  onClick={() => openGalleryAt(index)}
                  aria-label="Open photo full screen"
                  className="relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-2xl bg-(--chip)"
                >
                  <img src={images[Math.min(index, images.length - 1)].url} alt={property.title} className="h-full w-full object-cover" />
                  <span className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-[#0b1f3a]/70 text-white backdrop-blur">
                    <Maximize2 size={15} />
                  </span>
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-[#0b1f3a]/80 px-2.5 py-1 text-[11px] font-semibold text-white">
                    <Camera size={12} /> {images.length}
                  </span>
                </button>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {images.map((photo, i) => (
                    <button
                      key={photo.url + i}
                      onClick={() => setIndex(i)}
                      aria-label={`Show photo ${i + 1}`}
                      className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${
                        i === index ? 'border-(--accent)' : 'border-transparent opacity-70'
                      }`}
                    >
                      <img src={photo.url} alt="" loading="lazy" className="h-14 w-20 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
        </Reveal>

        {/* Quick key-facts strip — one scannable glance at the essentials. */}
        <Reveal appear delay={0.2} y={16}>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: BedDouble, label: 'Bedrooms', value: property.bedrooms > 0 ? String(property.bedrooms) : '—' },
            { icon: Bath, label: 'Bathrooms', value: property.bathrooms > 0 ? String(property.bathrooms) : '—' },
            { icon: Ruler, label: 'Floor area', value: floorAreaShort },
            { icon: Building2, label: 'Type', value: property.propertyType || 'Home' },
          ].map((fact) => (
            <div key={fact.label} className="flex items-center gap-3 rounded-2xl border border-(--line) bg-(--card) px-4 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--bg-soft) text-(--accent)">
                <fact.icon size={18} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-(--ink)">{fact.value}</div>
                <div className="text-[11px] uppercase tracking-wider text-(--muted)">{fact.label}</div>
              </div>
            </div>
          ))}
        </div>
        </Reveal>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-12">
          <div className="min-w-0 space-y-12">
            {property.description && (
              <section>
                <SectionHeading eyebrow="The residence" title="Overview" />
                <p className="mt-5 whitespace-pre-line text-[16px] leading-8 text-(--body)">{property.description}</p>
              </section>
            )}

            {/* Structured specification panel — tight, scannable rows */}
            <section>
              <SectionHeading eyebrow="At a glance" title="Property specifications" />
              <dl className="mt-6 grid gap-x-12 sm:grid-cols-2">
                {specRows.map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-(--line) py-3">
                    <dt className="text-sm text-(--muted)">{row.label}</dt>
                    <dd className="text-right text-sm font-semibold tabular-nums text-(--ink)">{row.value}</dd>
                  </div>
                ))}
              </dl>
              {property.paymentPlan && (
                <div className="mt-5 rounded-2xl bg-(--bg-soft) px-5 py-4">
                  <div className="text-[11px] font-bold uppercase tracking-[.18em] text-(--accent)">Payment plan</div>
                  <p className="mt-1.5 text-sm leading-7 text-(--body)">{property.paymentPlan}</p>
                </div>
              )}
            </section>

            {/* Floor plans — clean drawing sheets on the card surface. */}
            {plans.length > 0 && (
              <section>
                <SectionHeading eyebrow="Layouts" title="Floor plans" />
                <div className={`mt-6 grid gap-8 ${plans.length === 1 ? '' : 'sm:grid-cols-2'}`}>
                  {plans.map((plan, i) => {
                    const label = plan.alt && plan.alt !== 'Floor plan' ? plan.alt : `Floor plan ${i + 1}`
                    return (
                      <button
                        key={plan.url + i}
                        type="button"
                        onClick={() => openPlan(i)}
                        className={`group text-left ${plans.length === 1 ? 'mx-auto block w-full max-w-3xl' : ''}`}
                      >
                        <div className="relative overflow-hidden rounded-2xl border border-(--line) bg-(--card) p-6 shadow-[0_18px_50px_-38px_rgba(11,31,58,.55)] transition duration-300 group-hover:border-(--accent)/60 sm:p-8">
                          <div className="flex aspect-[4/3] items-center justify-center">
                            <img src={plan.url} alt={label} loading="lazy" className="max-h-full max-w-full object-contain" />
                          </div>
                          <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-(--ink-solid)/90 px-3 py-1.5 text-[11px] font-semibold text-white opacity-0 backdrop-blur transition duration-300 group-hover:opacity-100">
                            <Maximize2 size={12} /> Enlarge
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-(--ink)">{label}</span>
                          {plans.length > 1 && (
                            <span className="text-xs tabular-nums text-(--muted)">
                              {i + 1} / {plans.length}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {property.features.length > 0 && (
              <section>
                <SectionHeading eyebrow="What's included" title="Amenities & features" />
                <ul className="mt-5 flex flex-wrap gap-2.5">
                  {property.features.map((feature, i) => (
                    <RevealItem
                      key={`${feature}-${i}`}
                      delay={Math.min(i, 6) * 0.04}
                      className="inline-flex items-center gap-2 rounded-full border border-(--line) bg-(--card) px-4 py-2 text-sm text-(--body)"
                    >
                      <Check size={15} className="shrink-0 text-(--accent)" />
                      {feature}
                    </RevealItem>
                  ))}
                </ul>
              </section>
            )}

            {roomRows.length > 0 && (
              <section>
                <SectionHeading eyebrow="Spaces" title="Rooms & sizes" />
                <ul className="mt-6 divide-y divide-(--line)">
                  {roomRows.map((room) => (
                    <li key={room.id} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 py-3.5">
                      <div className="text-[15px] font-semibold text-(--ink)">{room.name || 'Room'}</div>
                      {room.sizeLabel && (
                        <>
                          <span className="text-(--line)" aria-hidden>
                            •
                          </span>
                          <div className="text-sm font-medium tabular-nums text-(--muted)">{room.sizeLabel}</div>
                        </>
                      )}
                      {room.description && <div className="w-full text-sm text-(--muted)">{room.description}</div>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <SectionHeading eyebrow="Where it is" title="Location" />
              <p className="mt-4 text-sm text-(--muted)">
                {formatLocation(property)}
                {property.address?.country ? `, ${property.address.country}` : ''}
              </p>

              {coordsValid ? (
                <div className="mt-5 overflow-hidden rounded-2xl border border-(--line)">
                  <MapView lat={property.coordinates.lat} lng={property.coordinates.lng} label={property.title} className="h-72 w-full sm:h-80" />
                </div>
              ) : (
                <p className="mt-5 rounded-2xl bg-(--bg-soft) px-4 py-3 text-xs text-(--muted)">
                  An exact map pin is not available for this listing. Contact the advisory desk for precise directions.
                </p>
              )}

              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-(--ink)/25 px-5 py-2.5 text-xs font-semibold text-(--ink) transition hover:bg-(--bg-soft)"
                >
                  <ExternalLink size={13} /> View on Google Maps
                </a>
              )}
            </section>

            {/* Advisory desk — real agency contact channels, no fabricated agent. */}
            <section>
              <SectionHeading eyebrow="Get in touch" title={AGENCY.desk} />
              <div className="mt-5 rounded-2xl border border-(--line) bg-(--card) p-6">
                <p className="text-sm leading-7 text-(--muted)">
                  Speak directly with the agency handling this listing to arrange a viewing or request the verified
                  document pack.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <a href={AGENCY.phoneHref} className="flex items-center gap-2.5 rounded-xl border border-(--line) px-4 py-3 text-sm font-semibold text-(--ink) transition hover:bg-(--bg-soft)">
                    <Phone size={16} className="text-(--accent)" /> Call
                  </a>
                  <a href={waHref} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-xl border border-(--line) px-4 py-3 text-sm font-semibold text-(--ink) transition hover:bg-(--bg-soft)">
                    <MessageCircle size={16} className="text-(--accent)" /> WhatsApp
                  </a>
                  <a href={mailHref} className="flex items-center gap-2.5 rounded-xl border border-(--line) px-4 py-3 text-sm font-semibold text-(--ink) transition hover:bg-(--bg-soft)">
                    <Mail size={16} className="text-(--accent)" /> Email
                  </a>
                </div>
                <p className="mt-4 text-xs text-(--muted)">
                  {AGENCY.name} · {AGENCY.phoneDisplay} · {AGENCY.email}
                </p>
              </div>
            </section>
          </div>

          {/* Sticky enquiry panel */}
          <Reveal appear delay={0.25} y={20} className="lg:sticky lg:top-24 lg:self-start">
          <aside>
            <div className="overflow-hidden rounded-[24px] border border-(--line) bg-(--card) shadow-[0_24px_60px_-40px_rgba(11,31,58,.6)]">
              <div className="bg-gradient-to-br from-[#0b1f3a] to-[#060f1c] p-6 text-white">
                <div className="text-[11px] font-bold uppercase tracking-[.2em] text-(--accent-soft)">
                  {isSold ? 'Sold listing' : 'Enquire about this listing'}
                </div>
                <div className="mt-1.5 font-serif text-2xl leading-tight">{AGENCY.desk}</div>
                <p className="mt-2 text-xs leading-6 text-white/70">
                  Request the full brochure, book a private viewing, or ask an advisor about{' '}
                  {property.propertyType || 'this home'}.
                </p>
              </div>

              <div className="p-6">
                <button
                  onClick={() => setInquiryOpen(true)}
                  disabled={isSold}
                  className="w-full rounded-full bg-(--accent) px-5 py-3.5 text-sm font-bold text-[#0b1f3a] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSold ? 'Sold — see similar homes' : 'Request a viewing'}
                </button>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <a
                    href={AGENCY.phoneHref}
                    className="flex items-center justify-center gap-1.5 rounded-full border border-(--line) px-4 py-3 text-sm font-semibold text-(--muted) transition hover:bg-(--bg-soft) hover:text-(--ink)"
                  >
                    <Phone size={15} /> Call
                  </a>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-full border border-(--line) px-4 py-3 text-sm font-semibold text-(--muted) transition hover:bg-(--bg-soft) hover:text-(--ink)"
                  >
                    <MessageCircle size={15} /> WhatsApp
                  </a>
                </div>

                <div className="mt-6 border-t border-(--line) pt-5">
                  <a href={mailHref} className="flex items-center gap-2.5 py-1.5 text-sm text-(--muted) transition hover:text-(--ink)">
                    <Mail size={15} className="shrink-0 text-(--accent)" /> {AGENCY.email}
                  </a>
                  <a href={AGENCY.phoneHref} className="mt-1 flex items-center gap-2.5 py-1.5 text-sm text-(--muted) transition hover:text-(--ink)">
                    <Phone size={15} className="shrink-0 text-(--accent)" /> {AGENCY.phoneDisplay}
                  </a>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => toggleFavorite(property.id)}
                    className={`flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                      liked ? 'border-(--accent) text-(--accent)' : 'border-(--line) text-(--muted) hover:bg-(--bg-soft)'
                    }`}
                  >
                    <Heart size={15} className={liked ? 'fill-(--accent) text-(--accent)' : ''} />
                    {liked ? 'Saved' : 'Save'}
                  </button>
                  <button
                    onClick={copyLink}
                    className="flex items-center justify-center gap-2 rounded-full border border-(--line) px-4 py-2.5 text-sm font-semibold text-(--muted) transition hover:bg-(--bg-soft)"
                  >
                    <Link2 size={15} />
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                </div>

                <div className="mt-6 flex items-center justify-between rounded-xl bg-(--bg-soft) px-4 py-3 text-xs text-(--muted)">
                  <span>{AGENCY.name}</span>
                  <span>Updated {formatDate(property.updatedAt)}</span>
                </div>
              </div>
            </div>
          </aside>
          </Reveal>
        </div>

        {similar.length > 0 && (
          <section className="mt-16">
            <SectionHeading eyebrow="Continue exploring" title="Similar homes nearby" />
            <div className="mt-6 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
              {similar.map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i, 4) * 0.06} y={20}>
                  <PropertyCard property={p} liked={isFavorite(p.id)} toggle={() => toggleFavorite(p.id)} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Fixed mobile action bar — keeps the next step visible on small screens.
          Slides up after the page content has settled in. */}
      <motion.div
        initial={{ y: 88, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.35 }}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-(--line) bg-(--card)/95 px-4 pt-3 shadow-[0_-10px_30px_-20px_rgba(11,31,58,.6)] backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleFavorite(property.id)}
            aria-label={liked ? 'Remove from shortlist' : 'Save this home'}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-(--line) text-(--muted) transition active:scale-95"
          >
            <motion.span
              key={String(liked)}
              initial={{ scale: 0.6, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 16 }}
              className="flex"
            >
              <Heart size={18} className={liked ? 'fill-(--accent) text-(--accent)' : ''} />
            </motion.span>
          </button>
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-(--line) px-4 py-3 text-sm font-semibold text-(--ink)"
          >
            <MessageCircle size={15} /> Contact
          </a>
          <button
            onClick={() => setInquiryOpen(true)}
            disabled={isSold}
            className="flex flex-1 items-center justify-center rounded-full bg-(--accent) px-4 py-3 text-sm font-bold text-[#0b1f3a] disabled:opacity-50"
          >
            {isSold ? 'Sold' : 'Request Viewing'}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {viewer && viewerImage && (
          <motion.div
            key="viewer"
            role="dialog"
            aria-modal="true"
            aria-label="Image viewer"
            onClick={() => setViewer(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#050d18]/94 p-4 backdrop-blur-sm"
          >
          <button
            type="button"
            onClick={() => setViewer(null)}
            aria-label="Close full screen"
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X size={22} />
          </button>

          {/* One photo hands over to the next: wait for the fade-out so the two
              never sit in the flex row together and shove each other sideways. */}
          <AnimatePresence mode="wait">
            <motion.img
              key={viewerImage.url}
              src={viewerImage.url}
              alt={viewerImage.alt}
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="max-h-[86vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
            />
          </AnimatePresence>

          {viewer.images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setViewer((v) => (v ? { ...v, i: (v.i - 1 + v.images.length) % v.images.length } : v))
                }}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setViewer((v) => (v ? { ...v, i: (v.i + 1) % v.images.length } : v))
                }}
                aria-label="Next image"
                className="absolute right-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <ChevronRight size={22} />
              </button>
              {/* Opacity only: this badge is centred with -translate-x-1/2, and an
                  animated transform would override that centring. */}
              <motion.span
                key={viewer.i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-xs font-semibold text-white"
              >
                {viewer.i + 1} / {viewer.images.length}
              </motion.span>
            </>
          )}
          </motion.div>
        )}
      </AnimatePresence>

      <SiteFooter />
      <AnimatePresence>
        {inquiryOpen && <InquiryDialog key="inquiry" close={() => setInquiryOpen(false)} property={property} />}
      </AnimatePresence>
    </main>
  )
}
