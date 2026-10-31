'use client'

import { MotionConfig, animate, motion, useInView } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

// One shared animation language for the whole site: a short fade + rise as
// elements enter the viewport. `once` keeps it to a single entrance (no repeat
// on scroll-up), and Motion's reducedMotion="user" swaps to a plain opacity
// cross-fade for visitors who prefer less motion. Use sparingly — sections and
// grid wrappers, not every line of text.
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  appear = false,
  scale,
  duration = 0.55,
  amount = 0.15,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  appear?: boolean
  /** Starting scale (<1 reads as a gentle zoom-in). */
  scale?: number
  duration?: number
  /** Fraction of the element that must be visible before a scroll entrance fires. */
  amount?: number
}) {
  const from = { opacity: 0, y, ...(scale !== undefined ? { scale } : {}) }
  const to = { opacity: 1, y: 0, ...(scale !== undefined ? { scale: 1 } : {}) }
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={className}
        initial={from}
        // Above-the-fold content animates on mount (appear); everything else
        // waits for its first scroll into view.
        {...(appear ? { animate: to } : { whileInView: to, viewport: { once: true, amount } })}
        transition={{ duration, ease: [0.21, 0.47, 0.32, 0.98], delay }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  )
}

/**
 * Opacity-only entrance with no movement. For content that sits inside an
 * already-animating panel, or overlays where a shift would look like a glitch.
 */
export function Fade({
  children,
  delay = 0,
  duration = 0.4,
  className,
}: {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
}) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={className}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration, delay, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  )
}

/**
 * List-item flavour of Reveal: identical rhythm but renders an <li>, so entries
 * inside a <ul> stay valid HTML.
 */
export function RevealItem({
  children,
  delay = 0,
  y = 12,
  className,
  amount = 0.2,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  amount?: number
}) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.li
        className={className}
        initial={{ opacity: 0, y }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount }}
        transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98], delay }}
      >
        {children}
      </motion.li>
    </MotionConfig>
  )
}

/**
 * Counts a real numeric statistic up when it first scrolls into view.
 * The final value is what renders before (and without) animation, so the number
 * is always correct for SSR, for no-JS visitors and for reduced-motion users —
 * the count-up is decoration only, never the source of the figure.
 */
export function AnimatedNumber({ value, duration = 1.1 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const [counting, setCounting] = useState<number | null>(null)

  // Adjust during render so the first counted frame paints together with the
  // in-view state; otherwise the final value flashes for one frame first.
  if (inView && counting === null && value > 0) setCounting(0)

  useEffect(() => {
    if (counting === null || value <= 0) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const controls = animate(0, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setCounting(Math.round(v)),
    })
    return () => controls.stop()
  }, [counting === null, value, duration])

  return <span ref={ref}>{(counting ?? value).toLocaleString('en-US')}</span>
}
