import { resolveMediaUrl } from './api'
import type { Media, Property, Room } from './types'

export const PLACEHOLDER_IMAGE = '/placeholder.jpg'

// Square meters is the platform's unit: the CMS asks for m² and every visitor-facing
// surface shows m². The API column stays square feet (unchanged storage), so the
// figure is converted at this one boundary — see sqMetersToStoredSquareFeet, used
// only when the admin saves, and squareMeters, used only when a number is displayed.
const SQFT_PER_SQM = 10.7639

export function squareMeters(squareFeet: number): number {
  return Math.round((squareFeet || 0) / SQFT_PER_SQM)
}

/** Turn an m² value typed in the CMS into the square-feet figure the API stores. */
export function sqMetersToStoredSquareFeet(value: number): number {
  return Math.round((value || 0) * SQFT_PER_SQM)
}

// Prices are shown as bare figures: no currency symbol and no ISO code anywhere on
// the site. The meaning of a number is carried by the label beside it ("Guide price",
// "Min price", "/ m²"), never by a prefix, so the same figure renders identically in
// the public site and the admin CMS.
const amount = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function formatPrice(price: number): string {
  return amount.format(price || 0)
}

// A schedule-priced listing quotes the cheapest unit that is still available — the same
// rule the API applies when it derives the stored price on save. Rows left unpriced are
// ignored, so a half-entered schedule never invents a figure.
export type UnitSchedule = {
  from: number
  to: number
  priced: number
  available: number
}

export function unitSchedule(property: Property): UnitSchedule | null {
  if ((property.pricingMode ?? 'single') !== 'schedule') return null
  const priced = (property.rooms ?? []).filter((room) => room.price > 0)
  if (priced.length === 0) return null
  const all = priced.map((room) => room.price)
  const open = priced.filter((room) => room.status !== 'Sold')
  // Sold units are excluded from the headline; if every unit is sold, quote the
  // schedule anyway rather than pretend the listing has no price.
  const basis = open.length > 0 ? open.map((room) => room.price) : all
  return {
    from: Math.min(...basis),
    to: Math.max(...all),
    priced: priced.length,
    available: open.length,
  }
}

// One label everywhere the site quotes a price: schedule listings read "From x",
// everything else shows the single figure.
export function priceLabel(property: Property): string {
  const schedule = unitSchedule(property)
  return schedule ? `From ${formatPrice(schedule.from)}` : formatPrice(property.price)
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
  return amount.format(Math.round(price / m2))
}

/** Format a stored square-feet figure as the m² value the site shows. */
export function formatArea(squareFeet: number): string {
  const m2 = squareMeters(squareFeet)
  return m2 > 0 ? `${formatNumber(m2)} m²` : '—'
}

// A room's size is free text from the CMS. When it's just a bare number we treat
// it as an area in the platform's unit (m²) and append it, so visitors always see a
// clear unit. Anything the admin typed with its own unit or dimensions (e.g.
// "4.2 × 3.6 m") is passed through untouched. Empty stays empty (renders nothing).
export function formatRoomSize(size: string): string {
  const raw = (size || '').trim()
  if (!raw) return ''
  if (/^[\d,]+(\.\d+)?$/.test(raw)) {
    const value = Number(raw.replace(/,/g, ''))
    if (Number.isFinite(value) && value > 0) return `${formatNumber(value)} m²`
  }
  return raw
}

export function formatLocation(property: Property): string {
  const { street, city, state, zip, country } = property.address ?? {}
  const primary = [city, state, zip].filter(Boolean).join(', ')
  return [street, primary, !primary ? country : ''].filter(Boolean).join(', ') || 'Location on request'
}

// Only gallery photos may represent a listing: floor plans are layout drawings and
// progress shots document the build, so both stay in their own section on the detail
// page instead of becoming a property's cover, card count or the landing backdrop.
export function isMarketingPhoto(media: Media): boolean {
  return media.kind !== 'floorplan' && media.kind !== 'progress'
}

export function galleryImages(property: Property): string[] {
  const urls = (property.media ?? [])
    .filter(isMarketingPhoto)
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
