'use client'

import { useState } from 'react'
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import type { PropertyQuery } from '@/lib/types'

const selectClass =
  'h-11 w-full rounded-xl border border-(--line) bg-(--card) px-3 text-sm text-(--muted) outline-none focus:border-(--ink)'

export function SearchFilters({
  filters,
  onChange,
}: {
  filters: PropertyQuery
  onChange: (next: PropertyQuery) => void
}) {
  const [open, setOpen] = useState(false)
  const set = (patch: Partial<PropertyQuery>) => onChange({ ...filters, ...patch })

  // Count of the collapsible controls that currently narrow the result set.
  // Shown as a badge on the mobile "Filters" button so a collapsed state
  // never hides the fact that filters are active.
  const activeCount = [filters.minPrice, filters.maxPrice, filters.beds, filters.baths].filter(Boolean).length
  const hasActive = Boolean(filters.q) || activeCount > 0

  return (
    <div className="mt-8 rounded-2xl border border-(--line) bg-(--card) p-4 shadow-[0_10px_30px_-24px_rgba(41,68,58,.4)]">
      {/* Top row: search always visible + a mobile-only toggle. On phones the
          detailed filters collapse so the listing grid sits high on the screen. */}
      <div className="flex items-center gap-3">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-(--line) px-3 focus-within:border-(--ink)">
          <Search size={16} className="shrink-0 text-(--muted)" />
          <input
            value={filters.q ?? ''}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Location, name or property type"
            aria-label="Search listings"
            className="size-full min-w-0 bg-transparent text-sm outline-none"
          />
        </label>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle filters"
          className="relative flex h-11 shrink-0 items-center gap-2 rounded-xl border border-(--line) bg-(--bg-soft) px-4 text-sm font-semibold text-(--ink) transition hover:bg-(--chip) md:hidden"
        >
          <SlidersHorizontal size={16} />
          Filters
          {activeCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-(--accent) text-[11px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Controls: a horizontal band on tablet/desktop, a collapsible panel on
          mobile that only renders when open. */}
      <div
        className={`${open ? 'mt-3' : 'hidden'} grid-cols-2 gap-3 md:mt-3 md:grid md:grid-cols-2 lg:grid-cols-5`}
      >
        <input
          type="number"
          min={0}
          value={filters.minPrice ?? ''}
          onChange={(e) => set({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="Min price"
          aria-label="Minimum price"
          className={selectClass}
        />
        <input
          type="number"
          min={0}
          value={filters.maxPrice ?? ''}
          onChange={(e) => set({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="Max price"
          aria-label="Maximum price"
          className={selectClass}
        />
        <select
          value={filters.beds ?? ''}
          onChange={(e) => set({ beds: e.target.value ? Number(e.target.value) : undefined })}
          aria-label="Minimum bedrooms"
          className={selectClass}
        >
          <option value="">Beds: any</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}+ beds
            </option>
          ))}
        </select>
        <select
          value={filters.baths ?? ''}
          onChange={(e) => set({ baths: e.target.value ? Number(e.target.value) : undefined })}
          aria-label="Minimum bathrooms"
          className={selectClass}
        >
          <option value="">Baths: any</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}+ baths
            </option>
          ))}
        </select>
        <select
          value={filters.sort ?? 'updated'}
          onChange={(e) => set({ sort: (e.target.value || 'updated') as PropertyQuery['sort'] })}
          aria-label="Sort listings"
          className={`${selectClass} col-span-2 lg:col-span-1`}
        >
          <option value="updated">Recently updated</option>
          <option value="newest">Newest listings</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>

        {hasActive && (
          <button
            onClick={() => {
              onChange({ sort: filters.sort, q: '' })
              setOpen(false)
            }}
            className="col-span-2 flex items-center justify-center gap-1.5 self-center rounded-xl px-3 py-2.5 text-xs font-semibold text-(--accent) hover:text-(--ink) md:col-span-2 lg:col-span-1 lg:justify-self-start"
          >
            <RotateCcw size={12} /> Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
