'use client'

import { ArrowUpRight, Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { Spec } from './spec'
import { CONTACT, SOCIALS, telHref, mailtoHref, whatsappHref, mapsHref } from '@/lib/site-contact'

const approachPillars = [
  {
    index: '01',
    title: 'Clear information',
    copy: 'Room dimensions, plans, amenities, and progress—everything you need to decide with confidence.',
  },
  {
    index: '02',
    title: 'Local perspective',
    copy: 'Neighborhood context and practical guidance from people who know each street.',
  },
  {
    index: '03',
    title: 'Personal service',
    copy: 'A thoughtful, responsive advisor from first conversation to keys in hand.',
  },
]

const services = [
  ['Real estate development', 'Planning and delivering residential and mixed-use buildings in prime locations.'],
  ['Real estate marketing', 'Full marketing agency for developers, from launch to final handover.'],
  ['Consulting', 'Feasibility studies, site selection, financing and joint ventures for developers and buyers.'],
  ['Property management', 'Building, hotel and property management structures that protect long-term value.'],
] as const

export function ApproachSection() {
  return (
    <section id="approach" className="mx-auto grid max-w-[1440px] gap-10 border-t border-(--line) px-5 py-20 lg:grid-cols-[.7fr_1.3fr] lg:px-10">
      <div>
        <div className="text-xs font-bold uppercase tracking-[.2em] text-(--accent)">Our approach</div>
        <h2 className="mt-3 max-w-md font-serif text-5xl text-(--ink)">Details make the difference.</h2>
      </div>
      <div className="grid gap-8 sm:grid-cols-3">
        {approachPillars.map((pillar) => (
          <div key={pillar.index}>
            <div className="font-serif text-2xl text-(--ink)">{pillar.index}</div>
            <h3 className="mt-5 font-semibold">{pillar.title}</h3>
            <p className="mt-2 text-sm leading-6 text-(--muted)">{pillar.copy}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function AboutSection({ listingCount = 0 }: { listingCount?: number }) {
  return (
    <section id="about" className="border-y border-(--line) bg-(--bg-soft) px-5 py-16 sm:py-24 lg:px-10">
      <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-(--accent)">Who we are</p>
          <h2 className="mt-4 max-w-xl font-serif text-4xl leading-tight tracking-tight text-(--ink) sm:text-6xl">
            A real estate partner built on trust.
          </h2>
        </div>
        <div className="max-w-2xl">
          <p className="text-base leading-8 text-(--muted)">
            Platinum Marketing Services PLC helps buyers, renters and investors make confident real estate decisions in
            Addis Ababa. We build long-term relationships through exceptional service, innovation, and advanced
            technology.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-6 border-t border-(--line) pt-6 sm:grid-cols-4">
            <Spec label="Live listings" value={String(listingCount)} />
            <Spec label="Based in" value="Bole" />
            <Spec label="Coverage" value="Addis Ababa" />
            <Spec label="Service" value="1:1 advisory" />
          </div>
        </div>
      </div>
    </section>
  )
}

export function ServicesSection({ startInquiry }: { startInquiry: () => void }) {
  return (
    <section id="services" className="mx-auto max-w-[1440px] px-5 py-16 sm:py-24 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-(--accent)">What we do</p>
          <h2 className="mt-3 font-serif text-4xl text-(--ink) sm:text-6xl">Everything property, under one roof.</h2>
        </div>
        <button
          onClick={startInquiry}
          className="rounded-full border border-(--line) px-5 py-3 text-sm font-semibold text-(--muted)"
        >
          All services <ArrowUpRight className="ml-2 inline" size={15} />
        </button>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map(([title, copy], i) => (
          <article key={title} className="rounded-2xl border border-(--line) bg-(--card) p-6">
            <div className="font-serif text-3xl text-(--accent)">0{i + 1}</div>
            <h3 className="mt-10 text-lg font-semibold text-(--ink)">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-(--muted)">{copy}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

const contactCards = [
  {
    icon: MapPin,
    title: 'Visit the office',
    lines: [...CONTACT.addressLines],
    href: mapsHref,
    cta: 'Open in Maps',
  },
  {
    icon: Phone,
    title: 'Call the sales desk',
    lines: [CONTACT.phoneDisplay, 'Site visits arranged same week'],
    href: telHref,
    cta: 'Call now',
  },
  {
    icon: Mail,
    title: 'Email us',
    lines: [CONTACT.email, 'Replies within one business day'],
    href: mailtoHref('Real estate enquiry'),
    cta: 'Write to us',
  },
  {
    icon: MessageCircle,
    title: 'Chat on WhatsApp',
    lines: [CONTACT.phoneDisplay, 'Fastest way to reach an advisor'],
    href: whatsappHref('Hello Platinum Properties, I would like to speak with an advisor.'),
    cta: 'Message us',
  },
]

export function ContactSection({ startInquiry }: { startInquiry: () => void }) {
  return (
    <section id="contact" className="mx-auto max-w-[1440px] px-5 py-16 sm:py-24 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-(--accent)">Contact</p>
          <h2 className="mt-3 font-serif text-4xl text-(--ink) sm:text-5xl">Talk to a real advisor.</h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-(--muted)">
            Call, write, or walk into the Bole office — or send an inquiry and we will come back to you.
          </p>
        </div>
        <button
          onClick={startInquiry}
          className="rounded-full bg-(--ink-solid) px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-(--chip) hover:text-(--ink)"
        >
          Send an inquiry <ArrowUpRight className="ml-2 inline" size={15} />
        </button>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {contactCards.map((card) => (
          <a
            key={card.title}
            href={card.href}
            target={card.href.startsWith('http') ? '_blank' : undefined}
            rel={card.href.startsWith('http') ? 'noreferrer' : undefined}
            className="group rounded-2xl border border-(--line) bg-(--card) p-6 transition hover:border-(--ink)"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-(--chip) text-(--ink)">
              <card.icon size={17} />
            </span>
            <h3 className="mt-4 font-semibold text-(--ink)">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-(--muted)">
              {card.lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-(--accent)">
              {card.cta}
              <ArrowUpRight size={12} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </a>
        ))}
      </div>
      <p className="mt-6 flex items-center gap-2 text-xs text-(--muted)">
        <Clock size={13} className="text-(--accent)" />
        {CONTACT.hoursLong}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-semibold uppercase tracking-[.14em] text-(--muted)">Follow us</span>
        {SOCIALS.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noreferrer"
            aria-label={s.label}
            title={s.label}
            className="flex size-9 items-center justify-center rounded-full border border-(--line) text-(--muted) transition hover:border-(--accent) hover:text-(--accent)"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d={s.path} />
            </svg>
          </a>
        ))}
      </div>
    </section>
  )
}

export function CtaSection({ startInquiry }: { startInquiry: () => void }) {
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-16 lg:px-10 lg:py-20">
      <div className="relative isolate overflow-hidden rounded-[28px] bg-(--ink-solid) p-8 text-white sm:p-12">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0b1f3a] to-[#060f1c]" />
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-(--accent)">Your next property starts here</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">Let’s arrange a viewing.</h2>
            <p className="mt-4 max-w-xl text-white/80">
              Tell us what you are looking for and our advisors will walk you through availability, payment plans and
              site visits — no obligation.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={startInquiry}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-(--accent) px-6 py-3.5 text-sm font-bold text-[#0b1f3a] transition hover:brightness-105"
            >
              Request a viewing <ArrowUpRight size={16} />
            </button>
            <a
              href={telHref}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <Phone size={15} /> Call an agent
            </a>
            <a
              href={whatsappHref('Hello Platinum Properties, I would like to arrange a viewing.')}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <MessageCircle size={15} /> WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
