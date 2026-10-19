'use client'

import { useEffect, useRef, useState } from 'react'
import type { Coordinates } from '@/lib/types'

// Default viewport when a listing has no pin yet (Addis Ababa).
const ADDIS_CENTER: Coordinates = { lat: 9.0054, lng: 38.7636 }

/**
 * True only when the pair is a real, in-range location. Guards against the
 * 0/0 default and against hand-typed nonsense (this project previously stored
 * values like lat=10250000) that would otherwise render a broken map.
 */
export function hasValidCoordinates(c?: Coordinates | null): boolean {
  return (
    !!c &&
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    c.lat >= -90 &&
    c.lat <= 90 &&
    c.lng >= -180 &&
    c.lng <= 180 &&
    (c.lat !== 0 || c.lng !== 0)
  )
}

// Leaflet is loaded on demand from a CDN so the app needs no npm dependency or
// map API key. The promise is memoised so multiple maps share one script load.
let leafletLoader: Promise<any> | null = null
function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if ((window as any).L) return Promise.resolve((window as any).L)
  if (leafletLoader) return leafletLoader
  leafletLoader = new Promise((resolve, reject) => {
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.onload = () => {
      const L = (window as any).L
      if (L) resolve(L)
      else reject(new Error('Leaflet failed to initialise'))
    }
    script.onerror = () => reject(new Error('Could not reach the map service'))
    document.head.appendChild(script)
  })
  return leafletLoader
}

/**
 * A single map component used two ways:
 *  - read-only (default): shows the listing pin with a labelled popup.
 *  - interactive: click anywhere to drop/relocate a draggable pin; every move
 *    is reported through onChange. Used by the admin CMS so staff pick a
 *    location on the map instead of typing raw coordinates.
 */
export function MapView({
  lat,
  lng,
  zoom = 15,
  interactive = false,
  onChange,
  label,
  className = 'h-72 w-full',
}: {
  lat: number
  lng: number
  zoom?: number
  interactive?: boolean
  onChange?: (coords: Coordinates) => void
  label?: string
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  const hasPin = hasValidCoordinates({ lat, lng })

  // Create the map once. Latest props are captured on first run; a second
  // effect keeps the marker/view in sync when they change later.
  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    let disposed = false

    loadLeaflet()
      .then((L) => {
        if (disposed || mapRef.current || !containerRef.current) return
        const start = hasPin ? { lat, lng } : ADDIS_CENTER
        const map = L.map(containerRef.current, {
          center: [start.lat, start.lng],
          zoom,
          scrollWheelZoom: interactive,
        })
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }).addTo(map)

        if (interactive) {
          if (hasPin) attachMarker(L, map, start.lat, start.lng)
          map.on('click', (e: any) => {
            const { lat: nLat, lng: nLng } = e.latlng
            if (markerRef.current) markerRef.current.setLatLng([nLat, nLng])
            else attachMarker(L, map, nLat, nLng)
            onChangeRef.current?.({ lat: nLat, lng: nLng })
          })
        } else if (hasPin) {
          const marker = L.marker([start.lat, start.lng]).addTo(map)
          if (label) marker.bindPopup(label)
          markerRef.current = marker
        }

        mapRef.current = map
        setState('ready')
        // Container size can settle a frame late; force a correct layout.
        setTimeout(() => map.invalidateSize(), 60)
      })
      .catch(() => {
        if (!disposed) setState('error')
      })

    return () => {
      disposed = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the pin and viewport aligned with the incoming coordinates.
  useEffect(() => {
    if (state !== 'ready' || !mapRef.current || !hasPin) return
    const L = (window as any).L
    if (!L) return
    const pos: [number, number] = [lat, lng]
    if (interactive) {
      if (markerRef.current) markerRef.current.setLatLng(pos)
      else attachMarker(L, mapRef.current, lat, lng)
    } else {
      if (!markerRef.current) {
        const marker = L.marker(pos).addTo(mapRef.current)
        if (label) marker.bindPopup(label)
        markerRef.current = marker
      } else {
        markerRef.current.setLatLng(pos)
      }
    }
    mapRef.current.setView(pos, mapRef.current.getZoom(), { animate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, hasPin, state])

  function attachMarker(L: any, map: any, mLat: number, mLng: number) {
    const marker = L.marker([mLat, mLng], { draggable: true }).addTo(map)
    marker.on('dragend', () => {
      const p = marker.getLatLng()
      onChangeRef.current?.({ lat: p.lat, lng: p.lng })
    })
    markerRef.current = marker
    return marker
  }

  return (
    <div className={`relative isolate z-0 bg-(--bg-soft) ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {state === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-(--bg-soft) text-xs text-(--muted)">
          Loading map…
        </div>
      )}
      {state === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-(--bg-soft) px-4 text-center text-xs text-(--muted)">
          <span>The map could not be loaded.</span>
          {hasPin && (
            <span className="font-semibold text-(--ink)">
              Pin: {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
          )}
        </div>
      )}
      {interactive && state === 'ready' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-3 pb-1.5 pt-6 text-[11px] font-medium text-white">
          Tap the map or drag the pin to set the exact spot.
        </div>
      )}
    </div>
  )
}
