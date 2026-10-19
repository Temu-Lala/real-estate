'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Building2, Clock, Heart, Mail, Menu, MessageCircle, Phone, X } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { CONTACT, telHref, mailtoHref, whatsappHref } from '@/lib/site-contact'

const links = [
  { label: 'Home', href: '/' },
  { label: 'Properties', href: '/properties' },
  { label: 'About', href: '/#about' },
  { label: 'Services', href: '/#services' },
  { label: 'Contact', href: '/#contact' },
]

export function SiteHeader({
  savedCount = 0,
  startInquiry,
}: {
  savedCount?: number
  startInquiry?: () => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  // CTAs open the inquiry dialog when a page provides one; otherwise they fall
  // back to the contact anchor so the header is safe to use anywhere.
  const contact = startInquiry ? (
    <button
      onClick={startInquiry}
      className="rounded-full bg-(--accent) px-5 py-2.5 text-xs font-bold text-[#0b1f3a] transition hover:brightness-105"
    >
      Contact us
    </button>
  ) : (
    <a
      href="/#contact"
      className="rounded-full bg-(--accent) px-5 py-2.5 text-xs font-bold text-[#0b1f3a] transition hover:brightness-105"
    >
      Contact us
    </a>
  )

  const listCta = startInquiry ? (
    <button
      onClick={startInquiry}
      className="hidden items-center gap-1.5 rounded-full border border-(--line) px-4 py-2.5 text-xs font-semibold text-(--ink) transition hover:bg-(--chip) lg:inline-flex"
    >
      List a property
    </button>
  ) : (
    <a
      href="/#contact"
      className="hidden items-center gap-1.5 rounded-full border border-(--line) px-4 py-2.5 text-xs font-semibold text-(--ink) transition hover:bg-(--chip) lg:inline-flex"
    >
      List a property
    </a>
  )

  return (
    <header className="sticky top-0 z-30 border-b border-(--line) bg-(--bg)/95 backdrop-blur">
      {/* Info strip — practical details before the visitor even scrolls. */}
      <div className="hidden border-b border-(--line) bg-(--bg-soft) md:block">
        <div className="mx-auto flex h-9 max-w-[1440px] items-center justify-between gap-6 px-5 text-[11px] font-medium text-(--muted) lg:px-10">
          <span className="flex items-center gap-1.5">
            <Clock size={12} className="text-(--accent)" />
            Mon–Fri 8:00–5:00 · Sat 8:00–1:00 · Serving Addis Ababa from Bole
          </span>
          <span className="flex items-center gap-5">
            <a href={telHref} className="flex items-center gap-1.5 hover:text-(--ink)">
              <Phone size={12} /> {CONTACT.phoneDisplay}
            </a>
            <a href={mailtoHref()} className="flex items-center gap-1.5 hover:text-(--ink)">
              <Mail size={12} /> {CONTACT.email}
            </a>
          </span>
        </div>
      </div>

      <div className="mx-auto flex h-[64px] max-w-[1440px] items-center justify-between gap-4 px-5 lg:h-[72px] lg:px-10">
        <Link href="/" className="flex min-w-0 shrink items-center gap-3" aria-label="Platinum Properties — home">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--ink-solid) text-(--accent)">
            <Building2 size={18} />
          </div>
          <div className="min-w-0">
            <div className="truncate font-serif text-xl tracking-tight text-(--ink)">Platinum Properties</div>
            <div className="hidden text-[9px] font-semibold uppercase tracking-[.22em] text-(--muted) sm:block">
              Addis Ababa · Real Estate
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-(--muted) lg:flex" aria-label="Main">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-(--ink)">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <ThemeToggle />
          <Link
            href="/#properties"
            className="hidden items-center gap-1.5 rounded-full border border-(--line) px-4 py-2 text-xs font-semibold text-(--muted) transition hover:bg-(--chip) hover:text-(--ink) sm:flex"
          >
            <Heart size={13} className={savedCount > 0 ? 'fill-(--accent) text-(--accent)' : ''} />
            Saved{savedCount > 0 ? ` (${savedCount})` : ''}
          </Link>
          {listCta}
          <div className="hidden lg:block">{contact}</div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-(--line) text-(--muted) transition hover:bg-(--chip) hover:text-(--ink) lg:hidden"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-(--line) bg-(--bg) px-5 py-4 lg:hidden" aria-label="Mobile">
          <div className="flex flex-col">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="border-b border-(--line) py-3 text-sm font-medium text-(--ink) last:border-0"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold">
            <Link
              href="/#properties"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-1.5 rounded-full border border-(--line) px-4 py-2.5 text-(--muted)"
            >
              <Heart size={13} className={savedCount > 0 ? 'fill-(--accent) text-(--accent)' : ''} />
              Saved{savedCount > 0 ? ` (${savedCount})` : ''}
            </Link>
            <a href={telHref} className="flex items-center gap-1.5 rounded-full bg-(--chip) px-4 py-2.5 text-(--ink)">
              <Phone size={13} /> Call us
            </a>
            <a
              href={whatsappHref('Hello Platinum Properties, I would like to speak with an advisor.')}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-(--chip) px-4 py-2.5 text-(--ink)"
            >
              <MessageCircle size={13} /> WhatsApp
            </a>
          </div>
          <div className="mt-4">{contact}</div>
        </nav>
      )}
    </header>
  )
}
