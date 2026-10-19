'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/**
 * Light/dark switch. The chosen theme is persisted to localStorage under
 * 'haven_theme' and applied to <html data-theme> — the inline script in the
 * root layout restores it before first paint, so this component only has to
 * keep the attribute and the stored value in sync from then on.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    setTheme(currentTheme())
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('haven_theme', next)
    } catch {
      // Storage unavailable (private mode) — the in-memory theme still applies.
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      className={`flex size-10 shrink-0 items-center justify-center rounded-full border border-(--line) text-(--muted) transition hover:bg-(--chip) hover:text-(--ink) lg:size-9 ${className}`}
    >
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
