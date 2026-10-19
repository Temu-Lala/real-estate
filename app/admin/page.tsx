'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowUpRight, BadgeDollarSign, Building2, Eye, FilePen, Image as ImageIcon, MessageSquare, Star } from 'lucide-react'
import type { Lead, Property } from '@/lib/types'
import { api } from '@/lib/api'
import { AdminPageHeader, ErrorNote, LoadingState, StatCard, StatusBadge } from '@/components/admin/admin-ui'
import { formatPrice, primaryImage } from '@/lib/format'

function shortDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminOverviewPage() {
  const [properties, setProperties] = useState<Property[] | null>(null)
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [views30, setViews30] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.adminListProperties(), api.listLeads()])
      .then(([p, l]) => {
        setProperties(p)
        setLeads(l)
      })
      .catch(() => setError('Unable to load workspace statistics. Check that the API is running and you are signed in.'))
  }, [])

  // Recent listing views for the analytics teaser. Fetched separately so a
  // missing analytics table never blocks the rest of the overview.
  useEffect(() => {
    api
      .adminAnalytics(30)
      .then((r) => setViews30(r.totals.views))
      .catch(() => setViews30(null))
  }, [])

  const listings = properties ?? []
  const inquiries = leads ?? []
  const mediaCount = listings.reduce((total, property) => total + property.media.length, 0)
  const newLeads = inquiries.filter((lead) => lead.status === 'new').length
  const drafts = listings.filter((p) => p.status === 'draft').length
  const activeCount = listings.filter((p) => p.status === 'active').length
  const soldCount = listings.filter((p) => p.isSold).length
  const featuredCount = listings.filter((p) => p.isFeatured).length

  return (
    <>
      <AdminPageHeader
        title="Workspace overview"
        copy="Live figures from the property database and inquiry inbox."
        action={
          <Link
            href="/admin/properties"
            className="rounded-full bg-(--ink-solid) px-5 py-3 text-sm font-semibold text-white hover:brightness-110"
          >
            Manage properties
          </Link>
        }
      />

      {error && (
        <div className="mt-6">
          <ErrorNote message={error} />
        </div>
      )}
      {!properties && !error && <LoadingState />}

      {properties && leads && (
        <>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Published listings"
              value={activeCount}
              icon={Building2}
              onClick={() => (window.location.href = '/admin/properties')}
            />
            <StatCard
              label="Draft listings"
              value={drafts}
              icon={FilePen}
              onClick={() => (window.location.href = '/admin/properties')}
            />
            <StatCard
              label="Sold listings"
              value={soldCount}
              icon={BadgeDollarSign}
              onClick={() => (window.location.href = '/admin/properties')}
            />
            <StatCard
              label="Featured listings"
              value={featuredCount}
              icon={Star}
              onClick={() => (window.location.href = '/admin/properties')}
            />
            <StatCard
              label="New inquiries"
              value={newLeads}
              icon={MessageSquare}
              onClick={() => (window.location.href = '/admin/leads')}
            />
            <StatCard
              label="Media assets"
              value={mediaCount}
              icon={ImageIcon}
              onClick={() => (window.location.href = '/admin/media')}
            />
            <StatCard
              label="Listing views · 30 days"
              value={views30 ?? '—'}
              icon={Eye}
              onClick={() => (window.location.href = '/admin/analytics')}
            />
          </div>

          <div className="mt-4 grid gap-4 rounded-2xl border border-(--line) bg-(--card) p-5 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-(--muted)">Active listings</div>
              <div className="mt-1 font-serif text-2xl text-(--ink)">{activeCount}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-(--muted)">Sold (hidden from site)</div>
              <div className="mt-1 font-serif text-2xl text-(--ink)">{soldCount}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-(--muted)">Featured</div>
              <div className="mt-1 font-serif text-2xl text-(--ink)">{featuredCount}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-(--muted)">Inquiries by stage</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {['new', 'contacted', 'qualified', 'closed'].map((s) => {
                  const n = inquiries.filter((l) => l.status === s).length
                  return (
                    <span key={s} className="rounded-full bg-(--chip) px-2 py-0.5 text-xs font-semibold capitalize text-(--muted)">
                      {s} {n}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-(--line) bg-(--card)">
              <header className="flex items-center justify-between border-b border-(--line) px-5 py-4">
                <h2 className="font-serif text-xl text-(--ink)">Latest inquiries</h2>
                <Link href="/admin/leads" className="flex items-center gap-1 text-xs font-semibold text-(--accent) hover:text-(--ink)">
                  View inbox <ArrowUpRight size={13} />
                </Link>
              </header>
              {inquiries.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-(--muted)">No customer inquiries yet.</p>
              ) : (
                <ul>
                  {inquiries.slice(0, 5).map((lead) => (
                    <li key={lead.id} className="flex items-center justify-between gap-4 border-b border-(--line) px-5 py-3.5 last:border-b-0">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-(--ink)">{lead.name}</div>
                        <div className="truncate text-xs text-(--muted)">{lead.message}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <StatusBadge status={lead.status} />
                        <div className="mt-1 text-[10px] text-(--muted)">{shortDate(lead.createdAt)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-(--line) bg-(--card)">
              <header className="flex items-center justify-between border-b border-(--line) px-5 py-4">
                <h2 className="font-serif text-xl text-(--ink)">Recently updated listings</h2>
                <Link href="/admin/properties" className="flex items-center gap-1 text-xs font-semibold text-(--accent) hover:text-(--ink)">
                  All properties <ArrowUpRight size={13} />
                </Link>
              </header>
              {listings.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-(--muted)">No properties yet — add your first listing.</p>
              ) : (
                <ul>
                  {listings.slice(0, 5).map((property) => (
                    <li key={property.id} className="flex items-center justify-between gap-4 border-b border-(--line) px-5 py-3.5 last:border-b-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <img src={primaryImage(property)} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-(--ink)">{property.title}</div>
                          <div className="text-xs text-(--muted)">
                            {formatPrice(property.price)} · {property.media.length} photos
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <StatusBadge status={property.status} />
                        <div className="mt-1 text-[10px] text-(--muted)">{shortDate(property.updatedAt)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </>
  )
}
