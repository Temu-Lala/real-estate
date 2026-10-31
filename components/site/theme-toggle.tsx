'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { motion } from 'motion/react'

type Theme = 'light' | 'dark'

// Feature-detected: the type is not in every TypeScript lib and the API is still
// missing in some engines, so the call site checks for the function at runtime.
type ViewTransitionDocument = Document & {
  startViewTransition?: (
    callback: () => void,
  ) => { ready: Promise<void>; finished: Promise<void> }
}

function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

// Must track the applied palette, not the OS preference: the metadata theme-color
// tags in the root layout are keyed on prefers-color-scheme, so a manual switch
// has to rewrite them or the browser chrome keeps showing the other theme's hue.
const THEME_HEX: Record<Theme, string> = { light: '#f5f3ee', dark: '#060f1c' }

function syncThemeColor(theme: Theme) {
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute('content', THEME_HEX[theme]))
}

/**
 * Light/dark switch. The chosen theme is persisted to localStorage under
 * 'haven_theme' and applied to <html data-theme> — the inline script in the
 * root layout restores it before first paint, so this component only has to
 * keep the attribute and the stored value in sync from then on.
 *
 * Switching theme does not just flip: the new palette shines outward from this
 * button as an expanding circle (see the `theme-reveal` rules in globals.css),
 * with the incoming page landing briefly lit so the light reads as spreading
 * across the whole area rather than swapping in place.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setTheme(currentTheme())
    syncThemeColor(currentTheme())
  }, [])

  function applyTheme(next: Theme) {
    document.documentElement.dataset.theme = next
    syncThemeColor(next)
    try {
      localStorage.setItem('haven_theme', next)
    } catch {
      // Storage unavailable (private mode) — the in-memory theme still applies.
    }
  }

  // Circle geometry: centred on this button, wide enough to reach the viewport's
  // farthest corner so no strip of the old palette is left behind.
  function origin() {
    const rect = buttonRef.current?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + rect.height / 2 : 0
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 16
    return { x, y, r }
  }

  // Used by the fallback path only: a real element would be painted underneath the
  // view-transition snapshots, so the primary path carries its light on the
  // incoming snapshot instead (the `theme-shimmer` keyframes).
  function shine({ x, y, r }: { x: number; y: number; r: number }) {
    const glow = document.createElement('div')
    glow.className = 'theme-shine'
    glow.setAttribute('aria-hidden', 'true')
    glow.style.left = `${x}px`
    glow.style.top = `${y}px`
    glow.style.width = `${r * 2}px`
    glow.style.height = `${r * 2}px`
    document.body.appendChild(glow)
    const remove = () => glow.remove()
    try {
      glow.animate(
        [
          { transform: 'translate(-50%, -50%) scale(.08)', opacity: 0.95 },
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
        ],
        { duration: 720, easing: 'cubic-bezier(.4, 0, .2, 1)' },
      ).finished.then(remove, remove)
    } catch {
      remove()
    }
    // Never strand the layer if the animation stalls (tab backgrounded, older engine)
    window.setTimeout(remove, 1200)
  }

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    const root = document.documentElement

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTheme(next)
      applyTheme(next)
      return
    }

    const geo = origin()
    // These stay on <html> between switches: they are inert until the next toggle
    // overwrites them, and clearing them mid-flight would collapse an in-progress
    // reveal (its clip-path reads the same custom properties).
    root.style.setProperty('--vt-x', `${Math.round(geo.x)}px`)
    root.style.setProperty('--vt-y', `${Math.round(geo.y)}px`)
    root.style.setProperty('--vt-r', `${Math.round(geo.r)}px`)

    const doc = document as ViewTransitionDocument
    if (typeof doc.startViewTransition === 'function') {
      root.classList.add('vt-reveal')
      let transition: { ready: Promise<void>; finished: Promise<void> } | undefined
      try {
        // flushSync so the icon swap happens inside the captured frames instead of
        // popping in on a later render pass.
        transition = doc.startViewTransition(() => {
          flushSync(() => {
            setTheme(next)
            applyTheme(next)
          })
        })
      } catch {
        transition = undefined
      }
      if (transition) {
        // Both promises can reject: `ready` when the update callback throws or the
        // transition aborts, `finished` when it is skipped. Neither rejection is an
        // error here (a hidden tab aborts transitions routinely), but an unhandled one
        // prints a console error on every swap — so both are attached.
        transition.ready.catch(() => {})
        const settle = () => {
          // An aborted transition may never have run the callback — guarantee the
          // palette landed rather than leaving the page half-switched.
          if (root.dataset.theme !== next) applyTheme(next)
          root.classList.remove('vt-reveal')
        }
        transition.finished.then(settle, settle)
        return
      }
    }

    // No View Transitions (or it refused): cross-fade every themed surface across
    // the swap while the gold pulse spreads out from the button.
    root.classList.add('theme-swapping')
    shine(geo)
    setTheme(next)
    applyTheme(next)
    window.setTimeout(() => root.classList.remove('theme-swapping'), 380)
  }

  return (
    <button
      ref={buttonRef}
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      className={`flex size-10 shrink-0 items-center justify-center rounded-full border border-(--line) text-(--muted) transition-[background-color,border-color,color] hover:bg-(--chip) hover:text-(--ink) active:scale-95 lg:size-9 ${className}`}
    >
      {/* Re-keyed per theme so the icon spins in on every switch. */}
      <motion.span
        key={theme === 'dark' ? 'sun' : 'moon'}
        initial={{ opacity: 0, rotate: -120, scale: 0.7 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="flex"
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </motion.span>
    </button>
  )
}
