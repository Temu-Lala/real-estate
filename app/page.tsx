'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import type { Property } from '@/lib/types'
import { api } from '@/lib/api'
import { useFavorites } from '@/lib/use-favorites'
import { SiteHeader } from '@/components/site/site-header'
import { Hero } from '@/components/site/hero'
import { LatestProperties } from '@/components/site/latest-properties'
import { InquiryDialog } from '@/components/site/inquiry-dialog'
import { AboutSection, ApproachSection, ContactSection, CtaSection } from '@/components/site/content-sections'
import { SiteFooter } from '@/components/site/site-footer'

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const { favorites, toggleFavorite } = useFavorites()

  // Home only needs the live inventory for the hero backdrop, the live count,
  // and the "latest listings" preview — the full browse/filtering lives on
  // /properties. Newest first so the preview surfaces what just landed.
  useEffect(() => {
    let active = true
    api
      .listProperties({ sort: 'newest' })
      .then((data) => {
        if (active) setProperties(data)
      })
      .catch(() => {
        if (active) setProperties([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const startInquiry = () => setInquiryOpen(true)

  return (
    <main className="min-h-screen bg-(--bg) text-(--body)">
      <SiteHeader savedCount={favorites.length} startInquiry={startInquiry} />

      {/* 02 — Hero + search (routes to the full /properties screen) */}
      <Hero properties={properties} loading={loading} startInquiry={startInquiry} />

      {/* 03 — Latest listings preview (max 5) + "View all" to /properties */}
      <LatestProperties
        properties={properties}
        loading={loading}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
      />

      {/* 06 — Why choose us + About */}
      <ApproachSection />
      <AboutSection listingCount={properties.length} />

      {/* 07 — Consultation and contact */}
      <ContactSection startInquiry={startInquiry} />
      <CtaSection startInquiry={startInquiry} />

      <SiteFooter />

      {/* AnimatePresence lets the dialog play its close animation. */}
      <AnimatePresence>
        {inquiryOpen && <InquiryDialog key="inquiry" close={() => setInquiryOpen(false)} property={null} />}
      </AnimatePresence>
    </main>
  )
}
