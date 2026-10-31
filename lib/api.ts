import type { AnalyticsReport, Lead, LeadInput, Media, Property, PropertyInput, PropertyQuery } from './types'

// export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '')
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '')
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...init })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new ApiError(response.status, detail.trim() || `Request failed with status ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

/** Media URLs come back relative (e.g. /uploads/x.jpg); resolve them against the API host. */
export function resolveMediaUrl(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
}

function toQueryString(query: PropertyQuery = {}): string {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  const text = params.toString()
  return text ? `?${text}` : ''
}

export const api = {
  // Public endpoints
  listProperties: (query: PropertyQuery = {}) => request<Property[]>(`/api/v1/properties${toQueryString(query)}`),
  getProperty: (idOrSlug: string) => request<Property>(`/api/v1/properties/${encodeURIComponent(idOrSlug)}`),
  createLead: (lead: LeadInput) => request<Lead>('/api/v1/leads', jsonInit('POST', lead)),

  // Admin endpoints (require the haven_admin session cookie)
  adminListProperties: () => request<Property[]>('/api/v1/admin/properties?status=all'),
  login: (email: string, password: string) =>
    request<{ status: string }>('/api/v1/admin/login', jsonInit('POST', { email, password })),
  logout: () => request<{ status: string }>('/api/v1/admin/logout', { method: 'POST' }),
  upsertProperty: (property: PropertyInput) =>
    request<Property>('/api/v1/admin/properties', jsonInit('POST', property)),
  archiveProperty: (id: string) =>
    request<void>(`/api/v1/admin/properties/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  setPropertyFlag: (id: string, field: 'sold' | 'featured', value: boolean) =>
    request<void>(`/api/v1/admin/properties/${encodeURIComponent(id)}/flag`, jsonInit('PATCH', { field, value })),
  listLeads: () => request<Lead[]>('/api/v1/admin/leads'),
  adminAnalytics: (days: number | 'all' = 30, propertyId?: string) => {
    const params = new URLSearchParams()
    params.set('days', String(days))
    if (propertyId) params.set('propertyId', propertyId)
    return request<AnalyticsReport>(`/api/v1/admin/analytics?${params.toString()}`)
  },
  updateLeadStatus: (id: string, status: string) =>
    request<void>('/api/v1/admin/leads', jsonInit('PATCH', { id, status })),
  uploadMedia: (propertyId: string, files: File[] | FileList, kind: 'gallery' | 'floorplan' = 'gallery') => {
    const form = new FormData()
    form.append('propertyId', propertyId)
    form.append('kind', kind)
    Array.from(files).forEach((file) => form.append('images', file))
    return request<Media[]>('/api/v1/admin/media', { method: 'POST', body: form })
  },
}
