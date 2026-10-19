'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BadgeDollarSign, ExternalLink, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react'
import type { Property } from '@/lib/types'
import { api } from '@/lib/api'
import { AdminPageHeader, EmptyState, ErrorNote, LoadingState, StatusBadge } from '@/components/admin/admin-ui'
import { PropertyForm } from '@/components/admin/property-form'
import { formatPrice, primaryImage } from '@/lib/format'

// Purpose tabs mirror the public hero (Buy → Sale, Rent, Commercial). 'All'
// clears the filter; listings with no purpose set only appear under 'All'.
const PURPOSES: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Buy', value: 'Sale' },
  { label: 'Rent', value: 'Rent' },
  { label: 'Commercial', value: 'Commercial' },
]

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<Property[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [purposeFilter, setPurposeFilter] = useState('')
  const [editing, setEditing] = useState<Property | null>(null)
  const [creating, setCreating] = useState(false)

  async function refresh() {
    try {
      setProperties(await api.adminListProperties())
      setError('')
    } catch {
      setError('Unable to load listings from the API.')
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function archive(property: Property) {
    if (!window.confirm(`Archive “${property.title}”? It will be removed from the public site.`)) return
    try {
      await api.archiveProperty(property.id)
      setProperties((current) => (current ?? []).filter((p) => p.id !== property.id))
    } catch {
      setError('Unable to archive that listing. Please try again.')
    }
  }

  // Optimistic sold/featured toggle backed by the flag endpoint.
  async function toggleFlag(property: Property, field: 'sold' | 'featured') {
    const key = field === 'sold' ? 'isSold' : 'isFeatured'
    const next = !property[key]
    const apply = (value: boolean) =>
      setProperties((current) => (current ?? []).map((p) => (p.id === property.id ? { ...p, [key]: value } : p)))
    apply(next)
    try {
      await api.setPropertyFlag(property.id, field, next)
    } catch {
      apply(!next)
      setError('Unable to update that listing. Please try again.')
    }
  }

  const needle = search.trim().toLowerCase()
  const visible = (properties ?? []).filter((p) => {
    if (purposeFilter && p.listingType !== purposeFilter) return false
    if (statusFilter === 'sold') {
      if (!p.isSold) return false
    } else if (statusFilter === 'featured') {
      if (!p.isFeatured) return false
    } else if (statusFilter && p.status !== statusFilter) {
      return false
    }
    if (!needle) return true
    return `${p.title} ${p.propertyType} ${p.address?.city ?? ''} ${p.slug}`.toLowerCase().includes(needle)
  })

  return (
    <>
      <AdminPageHeader
        title="Listings"
        copy="Create, edit, and archive the homes shown on the public site. Drafts stay private until published."
        action={
          <button
            onClick={() => setCreating(true)}
            className="rounded-full bg-(--ink-solid) px-5 py-3 text-sm font-semibold text-white hover:brightness-110"
          >
            <Plus className="mr-2 inline" size={16} />
            Add property
          </button>
        }
      />

      <div
        className="mt-6 flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-(--line) bg-(--card) p-1"
        role="group"
        aria-label="Filter by listing purpose"
      >
        {PURPOSES.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setPurposeFilter(tab.value)}
            aria-pressed={purposeFilter === tab.value}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
              purposeFilter === tab.value ? 'bg-(--ink-solid) text-white' : 'text-(--muted) hover:bg-(--chip) hover:text-(--ink)'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-(--line) bg-(--card) px-3 focus-within:border-(--ink)">
          <Search size={15} className="shrink-0 text-(--muted)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, type, city, or slug"
            aria-label="Search listings"
            className="size-full bg-transparent text-sm outline-none"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="h-11 rounded-xl border border-(--line) bg-(--card) px-3 text-sm text-(--muted) outline-none"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="sold">Sold</option>
          <option value="featured">Featured</option>
        </select>
      </div>

      {error && (
        <div className="mt-6">
          <ErrorNote message={error} />
        </div>
      )}
      {!properties && !error && <LoadingState />}
      {properties && visible.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title={properties.length === 0 ? 'No listings yet' : 'No listings match this filter'}
            copy={
              properties.length === 0
                ? 'Create your first property to publish it on the public site.'
                : 'Try a different search term or clear the purpose/status filters.'
            }
          />
        </div>
      )}

      {properties && visible.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-(--line) bg-(--card)">
          <div className="hidden grid-cols-[1.8fr_.7fr_.9fr_.7fr_auto] gap-4 border-b border-(--line) bg-(--chip) px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-(--muted) md:grid">
            <span>Property</span>
            <span>Price</span>
            <span>Beds / baths</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {visible.map((property) => (
            <div
              key={property.id}
              className="grid grid-cols-1 items-center gap-4 border-b border-(--line) px-5 py-4 last:border-b-0 md:grid-cols-[1.8fr_.7fr_.9fr_.7fr_auto]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <img src={primaryImage(property)} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0">
                  <div className="truncate font-semibold text-(--ink)">{property.title}</div>
                  <div className="text-xs text-(--muted)">
                    {property.propertyType || 'Home'} · {property.media.length} photos ·{' '}
                    {new Date(property.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <div className="text-sm font-semibold text-(--ink)">{formatPrice(property.price)}</div>
              <div className="text-sm text-(--muted)">
                {property.bedrooms} bd · {property.bathrooms} ba
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={property.status} />
                {property.isSold && (
                  <span className="rounded-full bg-(--danger-bg) px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-(--danger-fg)">
                    Sold
                  </span>
                )}
                {property.isFeatured && (
                  <span className="rounded-full bg-(--accent) px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0b1f3a]">
                    Featured
                  </span>
                )}
              </div>
              <div className="flex shrink-0 justify-end gap-2">
                <button
                  onClick={() => toggleFlag(property, 'featured')}
                  className={`rounded-full border p-2 transition ${
                    property.isFeatured ? 'border-(--accent) bg-(--accent)/15 text-(--accent)' : 'border-(--line) text-(--muted) hover:bg-(--chip)'
                  }`}
                  aria-label={property.isFeatured ? `Unfeature ${property.title}` : `Feature ${property.title}`}
                  title={property.isFeatured ? 'Featured — click to unfeature' : 'Feature on homepage'}
                >
                  <Star size={15} className={property.isFeatured ? 'fill-(--accent)' : ''} />
                </button>
                <button
                  onClick={() => toggleFlag(property, 'sold')}
                  className={`rounded-full border p-2 transition ${
                    property.isSold ? 'border-(--danger-fg) bg-(--danger-bg) text-(--danger-fg)' : 'border-(--line) text-(--muted) hover:bg-(--chip)'
                  }`}
                  aria-label={property.isSold ? `Mark ${property.title} available` : `Mark ${property.title} sold`}
                  title={property.isSold ? 'Sold — click to mark available' : 'Mark as sold (hide from website)'}
                >
                  <BadgeDollarSign size={15} />
                </button>
                <Link
                  href={`/properties/${encodeURIComponent(property.slug || property.id)}`}
                  className="rounded-full border border-(--line) p-2 text-(--muted) hover:bg-(--chip)"
                  aria-label={`View public page for ${property.title}`}
                  title="Public page (active listings only)"
                >
                  <ExternalLink size={15} />
                </Link>
                <button
                  onClick={() => setEditing(property)}
                  className="rounded-full border border-(--line) p-2 text-(--muted) hover:bg-(--chip)"
                  aria-label={`Edit ${property.title}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => archive(property)}
                  className="rounded-full border border-(--line) p-2 text-(--danger-fg) hover:bg-(--danger-bg)"
                  aria-label={`Archive ${property.title}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <PropertyForm
          property={editing}
          close={() => {
            setEditing(null)
            setCreating(false)
          }}
          onSaved={() => {
            setEditing(null)
            setCreating(false)
            refresh()
          }}
        />
      )}
    </>
  )
}
