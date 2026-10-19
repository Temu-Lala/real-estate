'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, Eye, Globe, MousePointerClick, RefreshCw, Search, Smartphone, TrendingUp, Users } from 'lucide-react'
import type { AnalyticsBreakdown, AnalyticsReport, Property } from '@/lib/types'
import { api } from '@/lib/api'
import { AdminPageHeader, ErrorNote, LoadingState, StatCard } from '@/components/admin/admin-ui'
import { formatNumber } from '@/lib/format'

const RANGES = [
  { label: '7 days', value: '7' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
  { label: '12 months', value: '365' },
  { label: 'All time', value: 'all' },
] as const

const SOURCE_LABEL: Record<string, string> = {
  direct: 'Direct',
  internal: 'Internal',
  search: 'Search engines',
  google: 'Google',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  twitter: 'X / Twitter',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  snapchat: 'Snapchat',
  email: 'Email',
  referral: 'Other referral',
  unknown: 'Unknown',
}

const DEVICE_LABEL: Record<string, string> = {
  mobile: 'Mobile',
  tablet: 'Tablet',
  desktop: 'Desktop',
  bot: 'Bot',
  unknown: 'Unknown',
}

const EVENT_LABEL: Record<string, string> = {
  view: 'Listing views',
  gallery: 'Gallery opens',
  plan: 'Floor-plan opens',
  inquiry: 'Inquiry opens',
  card: 'Listing card clicks',
}

const flag = (code: string) =>
  /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : '🌐'

// ISO country code → full English name via the browser's built-in locale data
// (no dependency, no static table). Falls back to the raw code if unmapped.
const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null
const countryName = (code: string) => {
  if (!code || code === 'unknown') return 'Unknown'
  try {
    return regionNames?.of(code) || code
  } catch {
    return code
  }
}

// Trend chart: views as gold bars, unique visitors as a navy line, pure SVG.
function TrendChart({ report }: { report: AnalyticsReport }) {
  const data = report.trend
  const max = Math.max(1, ...data.map((d) => d.views))
  const w = 100
  const h = 40
  const step = data.length > 1 ? w / (data.length - 1) : 0
  const line = data
    .map((d, i) => `${i * step},${h - (d.uniques / max) * h}`)
    .join(' ')
  const barWidth = data.length > 0 ? Math.min(3, (w / data.length) * 0.6) : 2

  return (
    <div className="rounded-2xl border border-(--line) bg-(--card) p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-(--ink)">Views over time</h2>
        <div className="flex items-center gap-4 text-xs text-(--muted)">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm bg-(--accent)" /> Views
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded bg-(--ink)" /> Unique
          </span>
        </div>
      </div>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-(--muted)">No views recorded yet for this range.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-5 h-40 w-full" role="img" aria-label="Listing views trend">
            {[0.25, 0.5, 0.75].map((g) => (
              <line key={g} x1="0" x2={w} y1={h * g} y2={h * g} stroke="currentColor" className="text-(--line)" strokeWidth="0.2" />
            ))}
            {data.map((d, i) => {
              const bh = (d.views / max) * h
              return (
                <rect
                  key={d.day}
                  x={i * step - barWidth / 2}
                  y={h - bh}
                  width={barWidth}
                  height={bh}
                  className="fill-(--accent)"
                  opacity={0.85}
                >
                  <title>{`${d.day}: ${d.views} views · ${d.uniques} unique`}</title>
                </rect>
              )
            })}
            {data.length > 1 && (
              <polyline points={line} fill="none" className="stroke-(--ink)" strokeWidth="0.6" strokeLinejoin="round" strokeLinecap="round" />
            )}
          </svg>
          <div className="mt-2 flex justify-between text-[11px] text-(--muted)">
            <span>{data[0]?.day}</span>
            <span>{data[data.length - 1]?.day}</span>
          </div>
        </>
      )}
    </div>
  )
}

// Horizontal share list for country/source/device breakdowns.
function BreakdownList({ title, icon: Icon, rows, labelFor }: { title: string; icon: React.ComponentType<{ size?: number; className?: string }>; rows: AnalyticsBreakdown[]; labelFor: (key: string) => string }) {
  const top = rows.slice(0, 7)
  const max = Math.max(1, ...top.map((r) => r.views))
  const total = rows.reduce((t, r) => t + r.views, 0)
  return (
    <section className="rounded-2xl border border-(--line) bg-(--card) p-5">
      <h2 className="flex items-center gap-2 font-serif text-xl text-(--ink)">
        <Icon size={18} className="text-(--accent)" /> {title}
      </h2>
      {top.length === 0 ? (
        <p className="py-8 text-center text-sm text-(--muted)">No data yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {top.map((r) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium text-(--ink)">{labelFor(r.key)}</span>
                <span className="shrink-0 tabular-nums text-(--muted)">
                  {formatNumber(r.views)}
                  <span className="ml-1.5 text-xs">({total ? Math.round((r.views / total) * 100) : 0}%)</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-(--chip)">
                <div className="h-full rounded-full bg-(--accent)" style={{ width: `${(r.views / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<string>('30')
  const [propertyId, setPropertyId] = useState<string>('')
  const [report, setReport] = useState<AnalyticsReport | null>(null)
  const [listings, setListings] = useState<Property[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.adminListProperties().then(setListings).catch(() => undefined)
  }, [])

  const days = range === 'all' ? 'all' : Number(range)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api
      .adminAnalytics(days as number | 'all', propertyId || undefined)
      .then((r) => active && setReport(r))
      .catch(() => active && setError('Unable to load analytics. Check that the API is running and the views table has been applied.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [days, propertyId])

  const totals = report?.totals ?? { views: 0, uniqueVisitors: 0 }
  const daysInWindow = report?.range.allTime ? Math.max(1, report.trend.length) : report?.range.days || 30
  const avgPerDay = report ? Math.round(totals.views / daysInWindow) : 0
  const topProperty = report?.properties[0]

  const propertyFilterOptions = useMemo(() => {
    if (!report) return []
    const inReport = report.properties.map((p) => ({ id: p.propertyId, title: p.title }))
    const ids = new Set(inReport.map((p) => p.id))
    const extra = listings.filter((l) => !ids.has(l.id)).map((l) => ({ id: l.id, title: l.title }))
    return [...inReport, ...extra]
  }, [report, listings])

  return (
    <>
      <AdminPageHeader
        title="Listing analytics"
        copy="Who is viewing your properties, where they come from and how they arrived. Visitor IPs are hashed and discarded — only coarse, anonymous data is stored."
        action={
          <div
            role="group"
            aria-label="Date range"
            className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-(--line) bg-(--card) p-1"
          >
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                aria-pressed={range === r.value}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  range === r.value ? 'bg-(--ink-solid) text-white' : 'text-(--muted) hover:text-(--ink)'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {report && propertyFilterOptions.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label htmlFor="listing-filter" className="text-sm font-medium text-(--muted)">
            Focus on a listing
          </label>
          <select
            id="listing-filter"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="rounded-xl border border-(--line) bg-(--card) px-3 py-2 text-sm text-(--ink)"
          >
            <option value="">All listings</option>
            {propertyFilterOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          {(loading || error) && <RefreshCw size={16} className="animate-spin text-(--muted)" />}
        </div>
      )}

      {error && (
        <div className="mt-6">
          <ErrorNote message={error} />
        </div>
      )}
      {loading && !report && <LoadingState />}

      {report && !loading && (
        <>
          {totals.views === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-(--line) bg-(--bg-soft) px-5 py-4 text-sm text-(--muted)">
              No listing views recorded yet{propertyId ? ' for this listing' : ''}. Open a property on the live site
              to start collecting analytics — visitor country appears once the site runs behind Vercel or Cloudflare
              (in local development this shows “Unknown”).
            </div>
          )}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total views" value={formatNumber(totals.views)} icon={Eye} />
            <StatCard label="Unique visitors" value={formatNumber(totals.uniqueVisitors)} icon={Users} />
            <StatCard label="Avg views / day" value={formatNumber(avgPerDay)} icon={TrendingUp} />
            <StatCard
              label="Most-viewed listing"
              value={topProperty ? formatNumber(topProperty.views) : '—'}
              icon={MousePointerClick}
            />
          </div>

          {topProperty && (
            <p className="mt-2 text-sm text-(--muted)">
              Top listing: <span className="font-semibold text-(--ink)">{topProperty.title}</span>{' '}
              <button onClick={() => setPropertyId(topProperty.propertyId)} className="text-(--accent) underline underline-offset-2">
                inspect
              </button>
            </p>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <TrendChart report={report} />
            <BreakdownList title="Devices" icon={Smartphone} rows={report.devices} labelFor={(k) => DEVICE_LABEL[k] ?? k} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <BreakdownList title="Where visitors are from" icon={Globe} rows={report.countries} labelFor={(k) => `${flag(k)} ${countryName(k)}`} />
            <BreakdownList title="Traffic source" icon={MousePointerClick} rows={report.sources} labelFor={(k) => SOURCE_LABEL[k] ?? k} />
            <section className="rounded-2xl border border-(--line) bg-(--card) p-5">
              <h2 className="font-serif text-xl text-(--ink)">Top listings</h2>
              {report.properties.length === 0 ? (
                <p className="py-8 text-center text-sm text-(--muted)">No listing views yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-(--line)">
                  {report.properties.slice(0, 7).map((p) => (
                    <li key={p.propertyId}>
                      <button
                        onClick={() => setPropertyId(p.propertyId)}
                        className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:text-(--accent)"
                      >
                        <span className="min-w-0 truncate text-sm font-medium text-(--ink)">{p.title}</span>
                        <span className="shrink-0 tabular-nums text-xs text-(--muted)">
                          {formatNumber(p.views)} views · {formatNumber(p.uniques)} u
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <BreakdownList
              title="On-listing engagement"
              icon={Activity}
              rows={(report.engagement ?? []).filter((e) => e.key !== 'view')}
              labelFor={(k) => EVENT_LABEL[k] ?? k}
            />
            <section className="rounded-2xl border border-(--line) bg-(--card) p-5">
              <h2 className="flex items-center gap-2 font-serif text-xl text-(--ink)">
                <Search size={18} className="text-(--accent)" /> What visitors search for
              </h2>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-xs uppercase tracking-wider text-(--muted)">Searches</div>
                  <div className="mt-1 font-serif text-2xl text-(--ink)">{formatNumber(report.searches?.total ?? 0)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-(--muted)">Unique</div>
                  <div className="mt-1 font-serif text-2xl text-(--ink)">{formatNumber(report.searches?.uniqueSearchers ?? 0)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-(--muted)">No results</div>
                  <div className="mt-1 font-serif text-2xl text-(--danger-fg)">{formatNumber(report.searches?.unmetDemand ?? 0)}</div>
                </div>
              </div>
              {(report.topSearches?.length ?? 0) === 0 ? (
                <p className="py-8 text-center text-sm text-(--muted)">No searches recorded yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {report.topSearches.slice(0, 7).map((s) => {
                    const max = Math.max(1, report.topSearches[0]?.searches ?? 1)
                    return (
                      <li key={s.query}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="truncate font-medium text-(--ink)">“{s.query}”</span>
                          <span className="shrink-0 tabular-nums text-(--muted)">{formatNumber(s.searches)}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-(--chip)">
                          <div className="h-full rounded-full bg-(--accent)" style={{ width: `${(s.searches / max) * 100}%` }} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>

          <p className="mt-6 text-xs text-(--muted)">
            {formatNumber(report.botsFiltered)} automated/bot views were excluded from these figures.
            {report.range.propertyId ? ' Filtered to a single listing.' : ''} Updated {new Date(report.generatedAt).toLocaleString('en-US')}.
          </p>
        </>
      )}
    </>
  )
}
