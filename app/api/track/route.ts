import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Go API base (server-side). NEXT_PUBLIC_API_URL is the public origin the
// browser uses; on the server we can reach the same host. Override with
// API_INTERNAL_URL when the Go service has a private address in production.
const API_BASE = (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '')

// Salt for the anonymous visitor token. Rotate daily implicitly by folding the
// date into the hash. Set ANALYTICS_SALT in the environment for stable uniques.
const SALT = process.env.ANALYTICS_SALT ?? 'platinum-analytics'

type TrackBody = { event?: string; propertyId?: string; query?: string; results?: number; path?: string }

// firstHeader returns the first non-empty value among the candidate headers.
function firstHeader(headers: Headers, names: string[]): string {
  for (const n of names) {
    const v = headers.get(n)?.trim()
    if (v) return v
  }
  return ''
}

// clientIP grabs the originating IP from proxy headers purely to hash it —
// it is never stored or forwarded to the database.
function clientIP(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return firstHeader(headers, ['x-real-ip', 'x-vercel-forwarded-for', 'cf-connecting-ip'])
}

// visitorToken is a privacy-preserving, daily-rotating identifier: SHA-256 of
// salt + day + IP + normalized user-agent, truncated. Same visitor counts as
// one unique per day; the raw IP is discarded immediately after hashing.
function visitorToken(ip: string, ua: string): string {
  const day = new Date().toISOString().slice(0, 10)
  const normalizedUA = ua.toLowerCase().slice(0, 256)
  return createHash('sha256').update(`${SALT}|${day}|${ip}|${normalizedUA}`).digest('hex').slice(0, 32)
}

function deviceType(ua: string): string {
  const s = ua.toLowerCase()
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return 'tablet'
  if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry/.test(s)) return 'mobile'
  if (/bot|crawler|spider|slurp|lighthouse|headless|phantom|curl|wget|python|scrapy/.test(s)) return 'bot'
  if (/macintosh|windows|linux|cros|mac os x/.test(s)) return 'desktop'
  return 'unknown'
}

function isBot(ua: string): boolean {
  return /bot|crawler|spider|slurp|lighthouse|headless|phantom|curl|wget|python|scrapy|facebookexternalhit|whatsapp|telegrambot|discordbot|linkpreview|preview/.test(
    ua.toLowerCase(),
  )
}

// referrerHost extracts a clean, lower-cased hostname from the Referer header.
function referrerHost(referer: string): string {
  if (!referer) return ''
  try {
    return new URL(referer).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

// classify maps a referrer host to a friendly traffic source, mirroring how
// GA4 / Plausible label sessions. Falls back to "referral" for unknown hosts.
function classify(host: string, ownHost: string): string {
  if (!host) return 'direct'
  if (ownHost && (host === ownHost || host.endsWith('.' + ownHost))) return 'internal'
  if (/(^|\.)google\.|bing\.com|duckduckgo\.|yahoo\.|yandex\.|baidu\.|startpage\.|ecosia\./.test(host)) return 'search'
  if (host === 't.co' || /(^|\.)(twitter|x)\.com$/.test(host)) return 'twitter'
  if (/(^|\.)facebook\.com$|^fb\.com$|(^|\.)fb\.me$/.test(host)) return 'facebook'
  if (/(^|\.)instagram\.com$/.test(host)) return 'instagram'
  if (/(^|\.)linkedin\.com$|^lnkd\.in$/.test(host)) return 'linkedin'
  if (/(^|\.)wa\.me$|whatsapp(\.|\.)|web\.whatsapp\.com/.test(host)) return 'whatsapp'
  if (/(^|\.)t\.me$|telegram/.test(host)) return 'telegram'
  if (/(^|\.)tiktok\.com$/.test(host)) return 'tiktok'
  if (/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) return 'youtube'
  if (/(^|\.)snapchat\.com$/.test(host)) return 'snapchat'
  if (/mail\.google\.com|(^|\.)gmail\.com$|outlook\.|yahoo\.com$|protonmail/.test(host)) return 'email'
  return 'referral'
}

// readGeo prefers Vercel's edge IP headers, then Cloudflare's. City is
// percent-encoded by Vercel, so we decode it. Nothing is stored on-device.
function readGeo(headers: Headers) {
  const country = firstHeader(headers, ['x-vercel-ip-country', 'cf-ipcountry'])
  const region = firstHeader(headers, ['x-vercel-ip-country-region'])
  const rawCity = firstHeader(headers, ['x-vercel-ip-city'])
  let city = ''
  try {
    city = rawCity ? decodeURIComponent(rawCity) : ''
  } catch {
    city = rawCity
  }
  return { country, region, city }
}

export async function POST(request: Request) {
  let body: TrackBody = {}
  try {
    // sendBeacon may post a Blob/text; tolerate both JSON and text bodies.
    const text = await request.text()
    body = text ? JSON.parse(text) : {}
  } catch {
    body = {}
  }

  const event = ((body.event ?? 'view').toString().trim().toLowerCase() || 'view').slice(0, 16)
  const propertyId = (body.propertyId ?? '').toString().trim()
  const query = (body.query ?? '').toString().trim()
  const results = Number.isFinite(Number(body.results)) ? Math.max(0, Math.trunc(Number(body.results))) : 0

  // Search events carry a query instead of a property; everything else needs a
  // property id. Anything with neither is ignored (still a 204 to the beacon).
  if (event === 'search' ? !query : !propertyId) {
    return NextResponse.json({ status: 'ignored' }, { status: 204 })
  }

  const headers = request.headers
  const ua = headers.get('user-agent') ?? ''
  const referer = headers.get('referer') ?? ''
  const ip = clientIP(headers)
  const geo = readGeo(headers)

  let ownHost = ''
  try {
    ownHost = new URL(request.url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    ownHost = ''
  }
  const host = referrerHost(referer)

  const payload = {
    event,
    propertyId,
    query,
    results,
    visitorToken: visitorToken(ip, ua),
    country: geo.country,
    region: geo.region,
    city: geo.city,
    source: classify(host, ownHost),
    referrerHost: host,
    deviceType: deviceType(ua),
    isBot: isBot(ua),
  }

  // Forward to the Go API. Fire-and-forget: never let ingestion failures break
  // the visitor's page. A non-2xx or throw is swallowed with a 204 response.
  try {
    const secret = process.env.TRACKING_SECRET
    await fetch(`${API_BASE}/api/v1/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'X-Tracking-Secret': secret } : {}),
      },
      body: JSON.stringify(payload),
    })
  } catch {
    // best-effort
  }

  return new NextResponse(null, { status: 204 })
}
