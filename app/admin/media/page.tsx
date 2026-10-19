'use client'

import { useEffect, useState } from 'react'
import type { Media, Property } from '@/lib/types'
import { api, resolveMediaUrl } from '@/lib/api'
import { EmptyState, ErrorNote, LoadingState } from '@/components/admin/admin-ui'

export default function AdminMediaPage() {
  const [properties, setProperties] = useState<Property[] | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .adminListProperties()
      .then((data) => {
        setProperties(data)
        if (data.length > 0) setSelectedId((current) => current || data[0].id)
      })
      .catch(() => setError('Unable to load listings from the API.'))
  }, [])

  const selected = (properties ?? []).find((property) => property.id === selectedId) ?? null

  async function upload() {
    if (!selected || files.length === 0) return
    // Client-side guard: formats and per-file size are checked before sending.
    // Pixel dimensions are intentionally unrestricted — the public site renders
    // every aspect ratio responsively.
    const oversize = files.filter((f) => f.size > 50 * 1024 * 1024)
    if (oversize.length > 0) {
      setError(`${oversize.length} file(s) exceed the 50MB per-image limit: ${oversize.map((f) => f.name).join(', ')}`)
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const uploaded = await api.uploadMedia(selected.id, files)
      setMessage(`${uploaded.length} image(s) uploaded to “${selected.title}”.`)
      setFiles([])
      const fresh = await api.adminListProperties()
      setProperties(fresh)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Images must be JPEG/PNG/GIF files under 50MB each.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div>
        <div className="text-xs font-bold uppercase tracking-[.2em] text-(--accent)">Media library</div>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-(--ink)">Property imagery</h1>
        <p className="mt-2 text-sm text-(--muted)">
          Upload as many gallery photos as a listing needs — bedrooms, bathrooms, kitchens, views, plans. Any pixel
          dimensions, any batch size; JPEG/PNG/GIF up to 50MB each. The site crops and scales every ratio responsively.
        </p>
      </div>

      {error && (
        <div className="mt-6">
          <ErrorNote message={error} />
        </div>
      )}
      {!properties && !error && <LoadingState />}

      {properties && properties.length === 0 && (
        <div className="mt-8">
          <EmptyState title="No listings to attach media to" copy="Create a property first, then upload its gallery." />
        </div>
      )}

      {properties && properties.length > 0 && (
        <div className="mt-8 grid gap-6">
          <div className="rounded-2xl border border-(--line) bg-(--card) p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs font-semibold text-(--muted)">Property</span>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full rounded-xl border border-(--line) px-3 py-2.5 text-sm outline-none"
                >
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-(--muted)">
                  Images{files.length > 0 ? ` — ${files.length} selected` : ''}
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/gif"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  className="block w-full text-sm text-(--muted) file:mr-3 file:rounded-full file:border-0 file:bg-(--chip) file:px-4 file:py-2 file:text-sm file:font-semibold file:text-(--ink)"
                />
              </label>
            </div>
            {message && <p className="mt-4 text-sm text-(--ink)">{message}</p>}
            <button
              onClick={upload}
              disabled={busy || files.length === 0 || !selected}
              className="mt-5 rounded-full bg-(--ink-solid) px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? 'Uploading…' : `Upload ${files.length || ''} image(s)`}
            </button>
          </div>

          {selected && (
            <div>
              <h2 className="font-serif text-2xl text-(--ink)">
                {selected.title} · {selected.media.length} asset(s)
              </h2>
              {selected.media.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {selected.media.map((media: Media) => (
                    <figure key={media.id} className="overflow-hidden rounded-xl border border-(--line) bg-(--card)">
                      <img src={resolveMediaUrl(media.url)} alt={media.alt} className="aspect-square w-full object-cover" />
                      <figcaption className="px-3 py-2 text-xs text-(--muted)">
                        {media.width}×{media.height} · {media.kind}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-(--muted)">This listing has no images yet.</p>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
