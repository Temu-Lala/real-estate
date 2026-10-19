'use client'

import Link from 'next/link'
import { Bath, BedDouble, Camera, Heart, MapPin, Ruler, Star } from 'lucide-react'
import type { Property } from '@/lib/types'
import { formatLocation, formatPrice, formatSquareFeet, primaryImage } from '@/lib/format'
import { trackCardClick } from '@/lib/track'

export function propertyHref(property: Property): string {
  return `/properties/${encodeURIComponent(property.slug || property.id)}`
}

export function PropertyCard({
  property,
  liked,
  toggle,
}: {
  property: Property
  liked: boolean
  toggle: () => void
}) {
  const image = primaryImage(property)
  const photoCount = property.media.filter((m) => m.kind !== 'floorplan').length
  // Prefer the explicit purpose badge; fall back to status when not set.
  const badge = property.listingType || (property.status === 'active' ? 'For sale' : property.status)

  return (
    <article
      onClick={(event) => {
        // Count an open intent when the card body/link is clicked, but ignore the
        // favorite toggle (and any other button) so it doesn't inflate clicks.
        if ((event.target as HTMLElement).closest('button')) return
        trackCardClick(property.id)
      }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-(--line) bg-(--card) shadow-[0_10px_30px_-24px_rgba(11,31,58,.4)] transition hover:border-(--accent)/50 hover:shadow-[0_18px_44px_-30px_rgba(11,31,58,.5)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-(--chip)">
        <Link href={propertyHref(property)} className="block size-full">
          <img
            src={image}
            alt={property.title}
            loading="lazy"
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
        </Link>
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="rounded-full bg-(--accent) px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0b1f3a]">
            {badge}
          </span>
          {property.propertyType && (
            <span className="rounded-full bg-[#0b1f3a]/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white">
              {property.propertyType}
            </span>
          )}
          {property.isFeatured && (
            <span className="flex items-center gap-1 rounded-full bg-[#0b1f3a] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-(--accent)">
              <Star size={11} className="fill-(--accent)" /> Featured
            </span>
          )}
        </div>
        <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
          <button
            onClick={toggle}
            className="flex size-10 items-center justify-center rounded-full bg-(--card)/90 text-(--ink)"
            aria-label={liked ? 'Remove from saved' : 'Save property'}
            aria-pressed={liked}
          >
            <Heart className={liked ? 'fill-(--accent) text-(--accent)' : ''} size={17} />
          </button>
          {photoCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-[#0b1f3a]/75 px-2.5 py-1 text-[10px] font-semibold text-white">
              <Camera size={11} /> {photoCount}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="font-serif text-lg font-semibold text-(--accent)">{formatPrice(property.price)}</div>
        <Link href={propertyHref(property)} className="mt-1 block text-left">
          <h3 className="font-serif text-xl leading-tight text-(--ink)">{property.title}</h3>
        </Link>
        <div className="mt-1 flex items-center gap-1 text-sm text-(--muted)">
          <MapPin size={13} /> {formatLocation(property)}
        </div>
        <div className="mt-4 flex gap-4 border-t border-(--line) pt-4 text-xs text-(--muted)">
          <span className="flex items-center gap-1">
            <BedDouble size={14} /> {property.bedrooms} beds
          </span>
          <span className="flex items-center gap-1">
            <Bath size={14} /> {property.bathrooms} baths
          </span>
          <span className="flex items-center gap-1">
            <Ruler size={14} /> {formatSquareFeet(property.squareFeet)}
          </span>
        </div>
        <Link
          href={propertyHref(property)}
          className="mt-5 inline-flex items-center justify-center rounded-full border border-(--ink)/25 px-5 py-2.5 text-xs font-semibold text-(--ink) transition hover:bg-(--ink-solid) hover:text-white"
        >
          View details
        </Link>
      </div>
    </article>
  )
}

export function PropertySkeleton() {
  return (
    <article className="animate-pulse overflow-hidden rounded-2xl border border-(--line) bg-(--card)">
      <div className="aspect-[4/3] bg-(--chip)" />
      <div className="p-5">
        <div className="h-5 w-1/3 rounded bg-(--chip)" />
        <div className="mt-3 h-6 w-3/4 rounded bg-(--chip)" />
        <div className="mt-2 h-4 w-1/2 rounded bg-(--chip)" />
        <div className="mt-4 h-9 rounded-full bg-(--chip)" />
      </div>
    </article>
  )
}
