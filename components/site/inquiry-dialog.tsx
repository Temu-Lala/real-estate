'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Mail, MessageCircle, Phone } from 'lucide-react'
import type { LeadInput, Property } from '@/lib/types'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import { CONTACT, telHref, whatsappHref, mailtoHref } from '@/lib/site-contact'
import { Overlay, OverlayPanel } from './overlay'

export function InquiryDialog({
  close,
  property,
}: {
  close: () => void
  property: Property | null
}) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(e.currentTarget)
    const payload: LeadInput = {
      name: String(form.get('name') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      phone: String(form.get('phone') ?? '').trim(),
      message: String(form.get('message') ?? '').trim(),
      propertyId: property?.id ?? '',
    }
    try {
      await api.createLead(payload)
      setSent(true)
    } catch {
      setError('We could not submit this right now. Please try again, or use a direct channel below.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Overlay close={close}>
      <OverlayPanel className="relative w-full max-w-lg rounded-[28px] bg-(--card) p-7 sm:p-10">
        <button onClick={close} className="absolute right-5 top-5" aria-label="Close">
          ✕
        </button>
        {sent ? (
          <div className="py-10 text-center">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 360, damping: 18 }}
              className="mx-auto flex size-12 items-center justify-center rounded-full bg-(--chip) text-(--ink)"
            >
              ✓
            </motion.div>
            <h2 className="mt-5 font-serif text-3xl text-(--ink)">We will be in touch.</h2>
            <p className="mt-2 text-sm text-(--muted)">Your inquiry has been recorded for our advisory team.</p>
          </div>
        ) : (
          <>
            <div className="text-xs font-bold uppercase tracking-[.2em] text-(--accent)">Private advisory</div>
            <h2 className="mt-2 font-serif text-4xl text-(--ink)">Tell us what you are looking for.</h2>
            {property && (
              <p className="mt-3 rounded-xl bg-(--bg-soft) px-4 py-3 text-sm text-(--muted)">
                Inquiry about <strong>{property.title}</strong>
                <span className="block text-xs text-(--muted)">Ref {property.id} · {formatPrice(property.price)}</span>
              </p>
            )}
            <form key={property?.id ?? 'general'} onSubmit={submit} className="mt-7 grid gap-4">
              <input
                name="name"
                required
                maxLength={120}
                placeholder="Full name"
                className="rounded-xl border border-(--line) bg-(--card) px-4 py-3 outline-none"
              />
              <input
                name="email"
                required
                type="email"
                placeholder="Email address"
                className="rounded-xl border border-(--line) bg-(--card) px-4 py-3 outline-none"
              />
              <input
                name="phone"
                maxLength={40}
                placeholder="Phone (optional)"
                className="rounded-xl border border-(--line) bg-(--card) px-4 py-3 outline-none"
              />
              <textarea
                name="message"
                required
                maxLength={5000}
                rows={4}
                defaultValue={property ? `I would like more information about ${property.title}.` : ''}
                placeholder="How can we help?"
                className="rounded-xl border border-(--line) bg-(--card) px-4 py-3 outline-none"
              />
              {error && (
                <p role="alert" className="text-sm text-(--danger-fg)">
                  {error}
                </p>
              )}
              <button
                disabled={busy}
                className="rounded-full bg-(--ink-solid) px-5 py-3 font-semibold text-white transition active:scale-[.99] disabled:opacity-60"
              >
                {busy ? 'Sending…' : 'Send inquiry'}
              </button>
            </form>
          </>
        )}

        {/* Direct, real channels — so the contact surface is never just a form:
            Call dials, WhatsApp opens a chat, Email opens the mail client. */}
        <div className="mt-7 border-t border-(--line) pt-5">
          <div className="text-xs font-semibold uppercase tracking-[.14em] text-(--muted)">
            Prefer to reach us directly?
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <a
              href={telHref}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-(--line) px-2 py-2.5 text-xs font-semibold text-(--ink) transition hover:bg-(--bg-soft)"
            >
              <Phone size={14} className="text-(--accent)" /> Call
            </a>
            <a
              href={whatsappHref('Hello Platinum Properties, I would like to speak with an advisor.')}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-(--line) px-2 py-2.5 text-xs font-semibold text-(--ink) transition hover:bg-(--bg-soft)"
            >
              <MessageCircle size={14} className="text-(--accent)" /> Chat
            </a>
            <a
              href={mailtoHref('Real estate enquiry')}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-(--line) px-2 py-2.5 text-xs font-semibold text-(--ink) transition hover:bg-(--bg-soft)"
            >
              <Mail size={14} className="text-(--accent)" /> Email
            </a>
          </div>
          <p className="mt-3 text-xs text-(--muted)">
            {CONTACT.phoneDisplay} · {CONTACT.email}
          </p>
        </div>
      </OverlayPanel>
    </Overlay>
  )
}
