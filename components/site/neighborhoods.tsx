'use client'

import { MapPin } from 'lucide-react'
import type { Property, PropertyQuery } from '@/lib/types'
import { formatPrice, primaryImage } from '@/lib/format'
import { Reveal } from './reveal'

type Area = { name: string; count: number; min: number; max: number; image: string }

export function NeighborhoodsSection({
  properties,
  setFilters,
}: {
  properties: Property[]
  setFilters: (next: PropertyQuery) => void
}) {
  // Derive areas strictly from live listings (sub-city/zone first, then city).
  const groups = new Map<string, Property[]>()
  for (const p of properties) {
    const area = (p.address?.state || p.address?.city || '').trim()
    if (!area) continue
    const arr = groups.get(area) ?? []
    arr.push(p)
    groups.set(area, arr)
  }

  const areas: Area[] = Array.from(groups.entries())
    .map(([name, list]) => {
      const prices = list.map((p) => p.price).filter((v) => v > 0)
      return {
        name,
        count: list.length,
        min: prices.length ? Math.min(...prices) : 0,
        max: prices.length ? Math.max(...prices) : 0,
        image: primaryImage(list[0]),
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  if (areas.length === 0) return null

  return (
    <section className="border-y border-(--line) bg-(--bg-soft) px-5 py-16 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-[1440px]">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-(--accent)">Where we work</p>
            <h2 className="mt-3 font-serif text-4xl text-(--ink) sm:text-5xl">Explore Addis Ababa neighborhoods.</h2>
          </div>
          <p className="max-w-sm text-sm text-(--muted)">
            Areas shown reflect where our current listings actually are, with indicative price ranges from those
            listings.
          </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area, i) => (
            <Reveal key={area.name} delay={0.06 * i} y={20} scale={0.985}>
            <button
              onClick={() => {
                setFilters({ q: area.name, sort: 'updated' })
                document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="group relative isolate h-52 overflow-hidden rounded-2xl border border-(--line) text-left transition-[border-color,box-shadow] duration-300 hover:border-(--accent)/60 hover:shadow-[0_18px_44px_-30px_rgba(11,31,58,.5)]"
            >
              <img
                src={area.image}
                alt={area.name}
                loading="lazy"
                className="absolute inset-0 -z-10 size-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#060f1c] via-[#0b1f3a]/70 to-[#0b1f3a]/20" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/80">
                  <MapPin size={13} className="text-(--accent)" /> {area.count} {area.count === 1 ? 'listing' : 'listings'}
                </div>
                <h3 className="mt-1 font-serif text-2xl">{area.name}</h3>
                {area.min > 0 && (
                  <p className="mt-1 text-sm text-white/85">
                    {area.min === area.max ? formatPrice(area.min) : `${formatPrice(area.min)} – ${formatPrice(area.max)}`}
                  </p>
                )}
              </div>
            </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
