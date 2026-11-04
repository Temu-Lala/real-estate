import { BRAND } from '@/lib/site-contact'

/**
 * The brand lockup from public/logo.png — house mark stacked over the "Platinum"
 * wordmark, flat gold artwork on a transparent background.
 *
 * Height drives every placement: pass a Tailwind `h-*` class and the width follows
 * the file's own 261:111 ratio (declared through width/height attributes so the
 * browser reserves the space and the layout never shifts), so the artwork is never
 * stretched. The `brand-logo` class lifts that gold on the dark palette — see
 * globals.css — while light mode renders the file exactly as designed.
 */
export function BrandLogo({
  className = 'h-10',
  alt = BRAND.name,
}: {
  className?: string
  alt?: string
}) {
  return (
    <img
      src={BRAND.logoSrc}
      alt={alt}
      width={BRAND.logoWidth}
      height={BRAND.logoHeight}
      decoding="async"
      draggable={false}
      className={`brand-logo w-auto shrink-0 select-none object-contain ${className}`}
    />
  )
}
