'use client'

import Link from 'next/link'
import { CONTACT, SOCIALS, telHref, mailtoHref } from '@/lib/site-contact'

const exploreLinks = [
  { label: 'Properties', href: '/#properties' },
  { label: 'Our approach', href: '/#approach' },
  { label: 'Services', href: '/#services' },
  { label: 'Contact', href: '/#contact' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-(--line) px-5 py-10 sm:py-12 lg:px-10">
      <div className="mx-auto grid max-w-[1440px] gap-8 overflow-hidden sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
        <div>
          <div className="font-serif text-2xl text-(--ink)">Platinum Properties</div>
          <p className="mt-3 max-w-xs text-sm leading-6 text-(--muted)">Your trusted real estate partner in Addis Ababa.</p>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-(--ink)">Explore</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-(--muted)">
            {exploreLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-(--ink)">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-(--ink)">Contact</h3>
          <div className="mt-4 flex min-w-0 flex-col gap-3 break-words text-sm text-(--muted)">
            <a href={telHref} className="transition hover:text-(--ink)">
              {CONTACT.phoneDisplay}
            </a>
            <a href={mailtoHref()} className="transition hover:text-(--ink)">
              {CONTACT.email}
            </a>
            <span>{CONTACT.address}</span>
          </div>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-(--ink)">Office hours</h3>
          <p className="mt-4 text-sm leading-6 text-(--muted)">
            Monday – Friday: 8:00 AM – 5:00 PM
            <br />
            Saturday: 8:00 AM – 1:00 PM
            <br />
            Sunday: Closed
          </p>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-[1440px] flex-col items-center justify-between gap-5 border-t border-(--line) pt-6 text-center text-xs text-(--muted) sm:flex-row sm:text-left">
        <span>© 2026 {CONTACT.agency}. All rights reserved.</span>
        <div className="flex flex-wrap items-center gap-2.5">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              aria-label={s.label}
              title={s.label}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-(--line) text-(--muted) transition hover:border-(--accent) hover:text-(--accent) sm:size-9"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d={s.path} />
              </svg>
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
