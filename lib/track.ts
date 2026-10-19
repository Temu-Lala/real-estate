// Fire-and-forget analytics beacons for the insights pipeline.
//
// The browser only ever talks to our same-origin route (`/api/track`), which
// resolves geo/source/device and hashes the IP server-side. Nothing identifying
// leaves the page beyond an event type, the property id (or search term), and
// the current path.
type TrackEvent = 'view' | 'gallery' | 'plan' | 'inquiry' | 'card' | 'search'

function send(event: TrackEvent, data: { propertyId?: string; query?: string; results?: number }): void {
  if (typeof window === 'undefined') return

  const payload = JSON.stringify({ event, path: window.location.pathname, ...data })

  // sendBeacon is preferred: it survives page navigation and is designed for
  // this exact "record on leave" use case. Fall back to fetch keepalive.
  try {
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' })
      if (navigator.sendBeacon('/api/track', blob)) return
    }
  } catch {
    // ignore and try fetch
  }

  void fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
    credentials: 'omit',
  }).catch(() => undefined)
}

export const trackPropertyView = (propertyId: string) => send('view', { propertyId })
export const trackGalleryOpen = (propertyId: string) => send('gallery', { propertyId })
export const trackPlanOpen = (propertyId: string) => send('plan', { propertyId })
export const trackInquiryOpen = (propertyId: string) => send('inquiry', { propertyId })
export const trackCardClick = (propertyId: string) => send('card', { propertyId })
export const trackSearch = (query: string, results: number) => send('search', { query, results })
