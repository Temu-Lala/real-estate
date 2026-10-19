'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Download, Phone, Search } from 'lucide-react'
import type { Lead } from '@/lib/types'
import { api } from '@/lib/api'
import { AdminPageHeader, EmptyState, ErrorNote, LoadingState, StatusBadge } from '@/components/admin/admin-ui'

const statuses = ['new', 'contacted', 'qualified', 'closed']

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const minutes = Math.floor((Date.now() - then) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    api
      .listLeads()
      .then(setLeads)
      .catch(() => setError('Unable to load inquiries from the API.'))
  }, [])

  async function updateStatus(id: string, status: string) {
    const previous = leads
    setLeads((current) => (current ?? []).map((lead) => (lead.id === id ? { ...lead, status } : lead)))
    try {
      await api.updateLeadStatus(id, status)
    } catch {
      setLeads(previous)
      setError('Unable to update that inquiry status. Please try again.')
    }
  }

  const all = leads ?? []
  const counts: Record<string, number> = {}
  all.forEach((lead) => {
    counts[lead.status] = (counts[lead.status] ?? 0) + 1
  })
  const needle = search.trim().toLowerCase()
  const visible = all.filter((lead) => {
    if (statusFilter && lead.status !== statusFilter) return false
    if (!needle) return true
    return `${lead.name} ${lead.email} ${lead.phone} ${lead.propertyId} ${lead.message}`.toLowerCase().includes(needle)
  })

  // The next stage in the pipeline, or null when already at the end.
  function nextStatus(current: string): string | null {
    const i = statuses.indexOf(current)
    return i >= 0 && i < statuses.length - 1 ? statuses[i + 1] : null
  }

  // Export exactly what the admin is currently viewing to a CSV download.
  function exportCsv() {
    const header = ['Name', 'Email', 'Phone', 'Property', 'Status', 'Received']
    const rows = visible.map((l) => [l.name, l.email, l.phone, l.propertyId || 'General', l.status, new Date(l.createdAt).toISOString()])
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `platinum-inquiries-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <AdminPageHeader
        title="Lead inbox"
        copy="Customer requests submitted through the contact form, newest first."
        action={
          <button
            onClick={exportCsv}
            disabled={visible.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-(--ink-solid) px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
          >
            <Download size={16} /> Export CSV
          </button>
        }
      />

      {/* Pipeline summary chips double as one-click filters */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
            statusFilter === '' ? 'bg-(--ink-solid) text-white' : 'border border-(--line) bg-(--card) text-(--muted) hover:border-(--ink)/40'
          }`}
        >
          All ({all.length})
        </button>
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
            className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition ${
              statusFilter === status
                ? 'bg-(--ink-solid) text-white'
                : 'border border-(--line) bg-(--card) text-(--muted) hover:border-(--ink)/40'
            }`}
          >
            {status} ({counts[status] ?? 0})
          </button>
        ))}
      </div>

      <label className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-(--line) bg-(--card) px-3 focus-within:border-(--ink)">
        <Search size={15} className="shrink-0 text-(--muted)" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, property, or message"
          aria-label="Search inquiries"
          className="size-full bg-transparent text-sm outline-none"
        />
      </label>

      {error && (
        <div className="mt-6">
          <ErrorNote message={error} />
        </div>
      )}
      {!leads && !error && <LoadingState />}
      {leads && visible.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title={all.length === 0 ? 'No inquiries yet' : 'Nothing matches this view'}
            copy={
              all.length === 0
                ? 'Submissions from the public contact form will appear here.'
                : 'Try a different search term or clear the status filter.'
            }
          />
        </div>
      )}

      {leads && visible.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-(--line) bg-(--card)">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-(--line) text-xs uppercase tracking-wider text-(--muted)">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Contact</th>
                <th className="px-5 py-3 font-semibold">Property</th>
                <th className="px-5 py-3 font-semibold">Message</th>
                <th className="px-5 py-3 font-semibold">Received</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((lead) => (
                <tr key={lead.id} className="border-b border-(--line) align-top last:border-b-0 hover:bg-(--card)">
                  <td className="px-5 py-4 font-semibold text-(--ink)">{lead.name}</td>
                  <td className="px-5 py-4 text-(--muted)">
                    <a href={`mailto:${lead.email}`} className="block underline-offset-2 hover:underline">
                      {lead.email}
                    </a>
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} className="mt-1 flex items-center gap-1 text-xs text-(--muted) hover:underline">
                        <Phone size={11} /> {lead.phone}
                      </a>
                    )}
                  </td>
                  <td className="px-5 py-4 text-(--muted)">
                    {lead.propertyId ? (
                      <Link
                        href={`/admin/properties`}
                        className="underline-offset-2 hover:underline"
                        title={`Manage listing ${lead.propertyId}`}
                      >
                        {lead.propertyId}
                      </Link>
                    ) : (
                      'General inquiry'
                    )}
                  </td>
                  <td className="max-w-[320px] px-5 py-4 leading-6 text-(--muted)">
                    <span className="line-clamp-3">{lead.message}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-(--muted)" title={new Date(lead.createdAt).toLocaleString()}>
                    {relativeDate(lead.createdAt)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={lead.status} />
                      {nextStatus(lead.status) && (
                        <button
                          onClick={() => updateStatus(lead.id, nextStatus(lead.status) as string)}
                          className="inline-flex items-center gap-0.5 rounded-full border border-(--line) px-2 py-1 text-[10px] font-semibold capitalize text-(--muted) transition hover:bg-(--chip) hover:text-(--ink)"
                          title={`Move to ${nextStatus(lead.status)}`}
                        >
                          <ChevronRight size={12} /> {nextStatus(lead.status)}
                        </button>
                      )}
                    </div>
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      aria-label={`Update status for ${lead.name}`}
                      className="mt-2 w-full rounded-xl border border-(--line) bg-(--card) px-3 py-2 text-xs outline-none"
                    >
                      {!statuses.includes(lead.status) && <option value={lead.status}>{lead.status}</option>}
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
