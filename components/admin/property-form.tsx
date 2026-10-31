'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Crosshair, MapPin, Plus, Trash2, X } from 'lucide-react'
import type { Property, PropertyInput, RoomInput } from '@/lib/types'
import { formatPrice } from '@/lib/format'
import { api, resolveMediaUrl } from '@/lib/api'
import { Overlay } from '@/components/site/overlay'
import { MapView, hasValidCoordinates } from '@/components/site/map-view'
import { ErrorNote, StatusBadge } from '@/components/admin/admin-ui'

const textFields: { key: keyof PropertyInput; label: string; type?: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'slug', label: 'Slug (optional — generated from title)' },
  { key: 'propertyType', label: 'Property type' },
  { key: 'bedrooms', label: 'Bedrooms', type: 'number' },
  { key: 'bathrooms', label: 'Bathrooms', type: 'number' },
  { key: 'squareFeet', label: 'Floor area (sq ft — m² shown automatically)', type: 'number' },
  { key: 'lotSquareFeet', label: 'Lot area (sq ft)', type: 'number' },
]

// Years the admin can pick from the Year-built dropdown (or type any year).
const thisYear = new Date().getFullYear()
const yearOptions = Array.from({ length: thisYear - 1944 }, (_, i) => thisYear + 5 - i)

const detailOptions = {
  listingType: ['', 'Sale', 'Rent', 'Commercial'],
  availability: ['', 'Ready to move', 'Under construction', 'Off-plan / pre-sale', 'Finishing soon'],
  furnishing: ['', 'Fully furnished', 'Semi furnished', 'Unfurnished'],
  tenure: ['', 'Free hold', 'Lease hold'],
}

// How a listing is quoted. In 'schedule' mode each room/unit row carries its own price
// and the API derives the listing price from the cheapest available unit, so cards,
// filters and sorting always agree with the published schedule.
const pricingModes = [
  { value: 'single', label: 'One price for the property' },
  { value: 'schedule', label: 'Separate price per room / unit' },
]

const unitStatusOptions = ['', 'Available', 'Reserved', 'Sold']

// One-tap additions for the common rooms in an Addis Ababa home; any other name can be
// typed into the row.
const roomPresets = [
  'Master bedroom',
  'Bedroom',
  'Living room',
  'Kitchen',
  'Dining room',
  'Bathroom',
  'Balcony',
  'Study',
  'Garage',
  'Staff room',
]

const emptyRoom: RoomInput = { name: '', size: '', level: '', status: '', price: 0, description: '' }

// A row is worth saving when it carries anything a visitor could read — units are
// routinely listed as size + price alone with no room name.
function isMeaningfulRoom(room: RoomInput): boolean {
  return Boolean(
    room.name.trim() || room.size.trim() || room.level.trim() || room.description.trim() || room.price > 0,
  )
}

const inputClass = 'w-full rounded-xl border border-(--line) bg-(--card) px-3 py-2.5 text-sm outline-none'

// Trim, drop blanks and de-dupe case-insensitively. Splitting on commas also tolerates a
// pasted "A, B, C" run so a single paste never becomes one giant amenity.
function normaliseFeatures(items: string[]): string[] {
  const seen = new Set<string>()
  return items
    .flatMap((item) => item.split(','))
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item.toLowerCase())) return false
      seen.add(item.toLowerCase())
      return true
    })
}

/**
 * A suggestion list you can still type over: the stored value stays free text, so a new
 * option never needs a code change. Listing purpose deliberately remains a strict select
 * because the site's Buy / Rent / Commercial tabs match its value exactly.
 */
function ComboField({
  label,
  value,
  options,
  listId,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  listId: string
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-semibold text-(--muted)">{label}</span>
      <input
        value={value}
        list={listId}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Pick or type your own"
        className={inputClass}
      />
      <datalist id={listId}>
        {options.filter(Boolean).map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </label>
  )
}

const addressFields: { key: keyof Property['address']; label: string }[] = [
  { key: 'street', label: 'House number / Street' },
  { key: 'city', label: 'City / Town (e.g. Addis Ababa)' },
  { key: 'state', label: 'Sub city / Zone (e.g. Bole)' },
  { key: 'zip', label: 'Postal code' },
  { key: 'country', label: 'Country' },
]

export function PropertyForm({
  property,
  close,
  onSaved,
}: {
  property: Property | null
  close: () => void
  onSaved: (saved: Property) => void
}) {
  const [form, setForm] = useState<PropertyInput>(
    property
      ? {
          id: property.id,
          title: property.title,
          slug: property.slug,
          description: property.description,
          price: property.price,
          status: property.status,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          squareFeet: property.squareFeet,
          lotSquareFeet: property.lotSquareFeet,
          yearBuilt: property.yearBuilt,
          propertyType: property.propertyType,
          listingType: property.listingType ?? '',
          availability: property.availability ?? '',
          availableFrom: property.availableFrom ?? '',
          paymentPlan: property.paymentPlan ?? '',
          furnishing: property.furnishing ?? '',
          tenure: property.tenure ?? '',
          isSold: property.isSold ?? false,
          isFeatured: property.isFeatured ?? false,
          pricingMode: property.pricingMode ?? 'single',
          address: property.address,
          coordinates: property.coordinates,
          features: property.features,
        }
      : {
          title: '',
          slug: '',
          description: '',
          price: 0,
          status: 'draft',
          bedrooms: 0,
          bathrooms: 0,
          squareFeet: 0,
          lotSquareFeet: 0,
          yearBuilt: 0,
          propertyType: '',
          listingType: '',
          availability: '',
          availableFrom: '',
          paymentPlan: '',
          furnishing: '',
          tenure: '',
          isSold: false,
          isFeatured: false,
          pricingMode: 'single',
          address: { street: '', city: '', state: '', zip: '', country: '' },
          coordinates: { lat: 0, lng: 0 },
          features: [],
        },
  )
  const [featureList, setFeatureList] = useState<string[]>(property?.features ?? [])
  const [featureDraft, setFeatureDraft] = useState('')
  const [rooms, setRooms] = useState<RoomInput[]>(
    (property?.rooms ?? []).map(({ name, size, level, status, price, description }) => ({
      name,
      size,
      level,
      status,
      price,
      description,
    })),
  )
  const [files, setFiles] = useState<File[]>([])
  const [planFiles, setPlanFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pinned = hasValidCoordinates(form.coordinates)

  // Derived pricing state — the schedule summary the admin sees while editing.
  const isSchedule = (form.pricingMode ?? 'single') === 'schedule'
  const pricedRooms = rooms.filter((room) => room.price > 0)
  const cheapestUnit = pricedRooms.length > 0 ? Math.min(...pricedRooms.map((room) => room.price)) : 0
  const dearestUnit = pricedRooms.length > 0 ? Math.max(...pricedRooms.map((room) => room.price)) : 0
  const availableUnits = pricedRooms.filter((room) => room.status !== 'Sold').length

  function patchRoom(index: number, patch: Partial<RoomInput>) {
    setRooms(rooms.map((room, j) => (j === index ? { ...room, ...patch } : room)))
  }

  function moveRoom(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= rooms.length) return
    const next = [...rooms]
    ;[next[index], next[target]] = [next[target], next[index]]
    setRooms(next)
  }

  function addRoom(name = '') {
    setRooms([...rooms, { ...emptyRoom, name }])
  }

  function addFeature(raw: string) {
    if (!raw.trim()) return
    setFeatureList(normaliseFeatures([...featureList, raw]))
    setFeatureDraft('')
  }

  // The row order the admin builds here is exactly the order visitors see (the API
  // stores it as sort_order), so presets never land out of sequence.
  const missingPresets = roomPresets.filter(
    (preset) => !rooms.some((room) => room.name.trim().toLowerCase() === preset.toLowerCase()),
  )

  // Ask the browser for the device position and drop the pin there, so the
  // admin never has to read or type coordinates by hand.
  function locateMe() {
    if (!navigator.geolocation) {
      setError('This browser cannot share a device location. Tap the map instead.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm({ ...form, coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      () => setError('Could not read your device location. Tap the map to place the pin.'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  async function save(publish: boolean) {
    if (!form.title.trim()) {
      setError('A property title is required.')
      return
    }
    // A schedule with no priced unit would silently fall back to the old figure, so
    // make the admin finish it rather than publish a misleading "From" price.
    if ((form.pricingMode ?? 'single') === 'schedule' && !rooms.some((room) => room.price > 0)) {
      setError('Per-unit pricing needs at least one room or unit with a price.')
      return
    }
    setBusy(true)
    setError('')
    const payload: PropertyInput = {
      ...form,
      status: publish ? 'active' : form.status,
      rooms: rooms
        .filter(isMeaningfulRoom)
        .map((room) => ({ ...room, price: Math.max(0, Math.round(room.price || 0)) })),
      features: normaliseFeatures(featureList),
    }
    try {
      const saved = await api.upsertProperty(payload)
      if (files.length > 0) {
        await api.uploadMedia(saved.id, files)
      }
      if (planFiles.length > 0) {
        await api.uploadMedia(saved.id, planFiles, 'floorplan')
      }
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save the property right now.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Overlay close={close}>
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-auto rounded-t-[28px] bg-(--card) p-7 sm:rounded-[28px] sm:p-10">
        <button onClick={close} className="absolute right-5 top-5" aria-label="Close">
          ✕
        </button>
        <div className="text-xs font-bold uppercase tracking-[.2em] text-(--accent)">Property CMS</div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="font-serif text-4xl text-(--ink)">{property ? 'Edit listing' : 'New listing'}</h2>
          {property && <StatusBadge status={property.status} />}
        </div>
        {property && <p className="mt-1 text-xs text-(--muted)">Reference: {property.id} · slug: {property.slug}</p>}

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {textFields.map((field) => (
            <label key={field.key}>
              <span className="mb-1 block text-xs font-semibold text-(--muted)">{field.label}</span>
              <input
                type={field.type ?? 'text'}
                value={String(form[field.key as keyof PropertyInput] ?? '')}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [field.key]: field.type === 'number' ? Number(e.target.value) || 0 : e.target.value,
                  })
                }
                className={inputClass}
              />
            </label>
          ))}

          <label>
            <span className="mb-1 block text-xs font-semibold text-(--muted)">Year built (pick or type)</span>
            <input
              type="number"
              min={1900}
              max={thisYear + 10}
              list="year-built-options"
              value={form.yearBuilt || ''}
              onChange={(e) => setForm({ ...form, yearBuilt: Number(e.target.value) || 0 })}
              placeholder="e.g. 2024"
              className={inputClass}
            />
            <datalist id="year-built-options">
              {yearOptions.map((y) => (
                <option key={y} value={String(y)} />
              ))}
            </datalist>
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold text-(--muted)">Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={inputClass}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </label>

          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-(--line) bg-(--card) px-4 py-3">
              <input
                type="checkbox"
                checked={!!form.isFeatured}
                onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                className="size-4 shrink-0 accent-[#C9A45C]"
              />
              <span className="text-sm">
                <span className="block font-semibold text-(--ink)">Feature on homepage</span>
                <span className="block text-xs text-(--muted)">Pins this listing to the top of the public results.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-(--line) bg-(--card) px-4 py-3">
              <input
                type="checkbox"
                checked={!!form.isSold}
                onChange={(e) => setForm({ ...form, isSold: e.target.checked })}
                className="size-4 shrink-0 accent-[#C9A45C]"
              />
              <span className="text-sm">
                <span className="block font-semibold text-(--ink)">Mark as sold</span>
                <span className="block text-xs text-(--muted)">Hides it from the public site; stays in your dashboard.</span>
              </span>
            </label>
          </div>

          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-(--muted)">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className={inputClass}
            />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-(--muted)">Amenities / features (comma separated)</span>
            <input value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} className={inputClass} />
          </label>

          {/* Additional listing details — shown on the public listing page */}
          <div className="sm:col-span-2 rounded-2xl border border-(--line) bg-(--bg-soft) p-4">
            <div className="text-xs font-bold uppercase tracking-[.16em] text-(--accent)">Listing details</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs font-semibold text-(--muted)">Listing purpose</span>
                <select
                  value={form.listingType ?? ''}
                  onChange={(e) => setForm({ ...form, listingType: e.target.value })}
                  className={inputClass}
                >
                  {detailOptions.listingType.map((o) => (
                    <option key={o} value={o}>{o === '' ? 'Not specified' : o}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-(--muted)">Availability</span>
                <select
                  value={form.availability ?? ''}
                  onChange={(e) => setForm({ ...form, availability: e.target.value })}
                  className={inputClass}
                >
                  {detailOptions.availability.map((o) => (
                    <option key={o} value={o}>{o === '' ? 'Not specified' : o}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-(--muted)">Available from (pick or type date)</span>
                <input
                  type="date"
                  value={form.availableFrom ?? ''}
                  onChange={(e) => setForm({ ...form, availableFrom: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-(--muted)">Furnishing</span>
                <select
                  value={form.furnishing ?? ''}
                  onChange={(e) => setForm({ ...form, furnishing: e.target.value })}
                  className={inputClass}
                >
                  {detailOptions.furnishing.map((o) => (
                    <option key={o} value={o}>{o === '' ? 'Not specified' : o}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-(--muted)">Tenure / ownership</span>
                <select
                  value={form.tenure ?? ''}
                  onChange={(e) => setForm({ ...form, tenure: e.target.value })}
                  className={inputClass}
                >
                  {detailOptions.tenure.map((o) => (
                    <option key={o} value={o}>{o === '' ? 'Not specified' : o}</option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-(--muted)">Payment plan</span>
                <input
                  value={form.paymentPlan ?? ''}
                  onChange={(e) => setForm({ ...form, paymentPlan: e.target.value })}
                  placeholder="e.g. 30% down payment, balance in 48 monthly installments"
                  className={inputClass}
                />
              </label>
            </div>
          </div>

          {/* Rooms & sizes editor */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-(--muted)">Rooms &amp; sizes</span>
              <button
                onClick={() => setRooms([...rooms, { name: '', size: '', description: '' }])}
                className="inline-flex items-center gap-1 rounded-full border border-(--line) px-3 py-1.5 text-xs font-semibold text-(--muted) hover:bg-(--chip)"
              >
                <Plus size={12} /> Add room
              </button>
            </div>
            <div className="mt-2 grid gap-2">
              {rooms.map((room, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={room.name}
                    onChange={(e) => setRooms(rooms.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))}
                    placeholder="Room name (e.g. Primary suite)"
                    className={`${inputClass} flex-1`}
                  />
                  <input
                    value={room.size}
                    onChange={(e) => setRooms(rooms.map((r, j) => (j === i ? { ...r, size: e.target.value } : r)))}
                    placeholder="Size (e.g. 14 × 12 ft)"
                    className={`${inputClass} w-36`}
                  />
                  <button
                    onClick={() => setRooms(rooms.filter((_, j) => j !== i))}
                    className="shrink-0 rounded-xl border border-(--line) px-3 text-(--danger-fg) hover:bg-(--danger-bg)"
                    aria-label={`Remove room ${i + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {rooms.length === 0 && (
                <p className="text-xs text-(--muted)">No rooms defined — visitors will only see the overview.</p>
              )}
            </div>
          </div>

          {addressFields.map((field) => (
            <label key={field.key}>
              <span className="mb-1 block text-xs font-semibold text-(--muted)">{field.label}</span>
              <input
                value={form.address?.[field.key] ?? ''}
                onChange={(e) => setForm({ ...form, address: { ...form.address, [field.key]: e.target.value } })}
                className={inputClass}
              />
            </label>
          ))}

          <div className="sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-(--muted)">
                <MapPin size={13} className="text-(--accent)" /> Location — tap the map to drop a pin
              </span>
              <button
                type="button"
                onClick={locateMe}
                className="inline-flex items-center gap-1.5 rounded-full border border-(--line) px-3 py-1.5 text-xs font-semibold text-(--muted) hover:bg-(--chip) hover:text-(--ink)"
              >
                <Crosshair size={13} /> Use my location
              </button>
            </div>
            <div className="mt-2 overflow-hidden rounded-2xl border border-(--line)">
              <MapView
                interactive
                lat={form.coordinates?.lat ?? 0}
                lng={form.coordinates?.lng ?? 0}
                label={form.title || 'Listing location'}
                onChange={(coords) => setForm({ ...form, coordinates: coords })}
                className="h-72 w-full"
              />
            </div>
            <p className="mt-2 text-xs text-(--muted)">
              {pinned
                ? `Pinned at ${form.coordinates?.lat?.toFixed(5)}, ${form.coordinates?.lng?.toFixed(5)}`
                : 'No location pinned yet — visitors will see the area description only.'}
            </p>
          </div>

          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-(--muted)">
              Gallery photos — the main marketing images (exterior, living room, kitchen, bedrooms, views). No pixel or
              count limits; JPEG/PNG/GIF up to 50MB each
            </span>
            {property && property.media.some((m) => m.kind !== 'floorplan') && (
              <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                {property.media.filter((m) => m.kind !== 'floorplan').map((m) => (
                  <img key={m.id} src={resolveMediaUrl(m.url)} alt={m.alt} className="h-16 w-24 shrink-0 rounded-lg object-cover" />
                ))}
              </div>
            )}
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="block w-full text-sm text-(--muted) file:mr-3 file:rounded-full file:border-0 file:bg-(--chip) file:px-4 file:py-2 file:text-sm file:font-semibold file:text-(--ink)"
            />
            {files.length > 0 && (
              <span className="mt-1 block text-xs text-(--muted)">{files.length} photo(s) selected — uploaded with save</span>
            )}
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-(--muted)">
              Floor plans — upload one or more plan images per property. They appear in their own &ldquo;Floor plans&rdquo;
              section on the listing. JPEG/PNG/GIF up to 50MB each
            </span>
            {property && property.media.some((m) => m.kind === 'floorplan') && (
              <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                {property.media.filter((m) => m.kind === 'floorplan').map((m) => (
                  <img key={m.id} src={resolveMediaUrl(m.url)} alt={m.alt} className="h-16 w-24 shrink-0 rounded-lg border border-(--line) bg-(--card) object-contain p-1" />
                ))}
              </div>
            )}
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif"
              onChange={(e) => setPlanFiles(Array.from(e.target.files ?? []))}
              className="block w-full text-sm text-(--muted) file:mr-3 file:rounded-full file:border-0 file:bg-(--ink-solid) file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
            {planFiles.length > 0 && (
              <span className="mt-1 block text-xs text-(--muted)">{planFiles.length} floor plan(s) selected — uploaded with save</span>
            )}
          </label>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorNote message={error} />
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => save(false)}
            disabled={busy}
            className="w-full rounded-full border border-(--ink)/25 px-5 py-3 font-semibold text-(--ink) disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save as draft'}
          </button>
          <button
            onClick={() => save(true)}
            disabled={busy}
            className="w-full rounded-full bg-(--ink-solid) px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Saving…' : property?.status === 'active' ? 'Save & keep live' : 'Publish listing'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}
