import { resolveMediaUrl } from './api'
import type { Property, Room } from './types'

export const PLACEHOLDER_IMAGE = '/placeholder.jpg'

// Ethiopian listings quote in both square feet and square meters, so the
// public UI always shows the pair. The stored value is square feet.
const SQFT_PER_SQM = 10.7639

export function squareMeters(squareFeet: number): number {
  return Math.round((squareFeet || 0) / SQFT_PER_SQM)
}

const etb = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'ETB',
  maximumFractionDigits: 0,
})

export function formatPrice(price: number): string {
  return etb.format(price || 0)
}

export function formatNumber(value: number): string {
  return (value || 0).toLocaleString('en-US')
}

// Renders an ISO date (YYYY-MM-DD) as "Sep 2027"; falls back to the raw text
// so free-form values from the CMS never break the layout.
export function formatFriendlyDate(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// Price per built square meter — the unit buyers in Addis compare listings by.
export function formatPricePerSqm(price: number, squareFeet: number): string {
  const m2 = squareMeters(squareFeet)
  if (!price || !m2) return '—'
  return etb.format(Math.round(price / m2))
}

export function formatSquareFeet(value: number): string {
  if (!value) return '—'
  const m2 = squareMeters(value)
  return m2 > 0 ? `${formatNumber(value)} sq ft (${formatNumber(m2)} m²)` : `${formatNumber(value)} sq ft`
}

// A room's size is free text from the CMS. When it's just a bare number we treat
// it as an area in the platform's base unit (sq ft) and show the metric pair —
// exactly like the specification panel — so visitors always see a clear unit.
// Anything the admin typed with its own unit or dimensions (e.g. "4.2 × 3.6 m",
// "12 ft × 10 ft") is passed through untouched. Empty stays empty (renders nothing).
export function formatRoomSize(size: string): string {
  const raw = (size || '').trim()
  if (!raw) return ''
  if (/^[\d,]+(\.\d+)?$/.test(raw)) {
    const value = Number(raw.replace(/,/g, ''))
    if (Number.isFinite(value) && value > 0) {
      const m2 = squareMeters(value)
      return m2 > 0 ? `${formatNumber(value)} sq ft (${formatNumber(m2)} m²)` : `${formatNumber(value)} sq ft`
    }
  }
  return raw
}

export function formatLocation(property: Property): string {
  const { street, city, state, zip, country } = property.address ?? {}
  const primary = [city, state, zip].filter(Boolean).join(', ')
  return [street, primary, !primary ? country : ''].filter(Boolean).join(', ') || 'Location on request'
}

export function galleryImages(property: Property): string[] {
  // Floor plans are layout drawings, not marketing shots — keep them out of
  // thumbnails and the landing hero so a plan never becomes a property's cover.
  const urls = (property.media ?? [])
    .filter((media) => media.kind !== 'floorplan')
    .map((media) => resolveMediaUrl(media.url))
    .filter(Boolean)
  return urls.length > 0 ? urls : [PLACEHOLDER_IMAGE]
}

export function primaryImage(property: Property): string {
  return galleryImages(property)[0]
}

export function roomLabel(room: Room): string {
  return [room.name, formatRoomSize(room.size)].filter(Boolean).join(' · ')
}

export function emptyAddress(): Property['address'] {
  return { street: '', city: '', state: '', zip: '', country: '' }
}
