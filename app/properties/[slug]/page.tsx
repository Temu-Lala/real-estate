import type { Metadata } from 'next'
import { PropertyDetail } from '@/components/site/property-detail'

export const metadata: Metadata = {
  title: 'Property listing — Platinum Properties',
  description: 'Explore the full listing details, gallery, rooms and location.',
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <PropertyDetail slug={decodeURIComponent(slug)} />
}
