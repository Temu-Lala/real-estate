'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BarChart3, Building2, Image as ImageIcon, LayoutDashboard, LogOut, Menu, MessageSquare, X } from 'lucide-react'
import { api } from '@/lib/api'
import { LoadingState } from '@/components/admin/admin-ui'

const nav = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard, count: null },
  { label: 'Properties', href: '/admin/properties', icon: Building2, count: 'properties' },
  { label: 'Inquiries', href: '/admin/leads', icon: MessageSquare, count: 'inquiries' },
  { label: 'Media library', href: '/admin/media', icon: ImageIcon, count: 'media' },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, count: null },
]

type Counts = { properties: number; inquiries: number; media: number }
type SessionState = 'checking' | 'authorized' | 'unauthorized'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginRoute = pathname === '/admin/login'
  const [session, setSession] = useState<SessionState>('checking')
  const [counts, setCounts] = useState<Counts>({ properties: 0, inquiries: 0, media: 0 })
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    if (isLoginRoute) return
    api
      .listLeads()
      .then(() => setSession('authorized'))
      .catch(() => setSession('unauthorized'))
  }, [isLoginRoute])

  // Live workspace counts power the sidebar badges. Best-effort refresh on
  // mount and whenever the route changes so numbers stay honest.
  useEffect(() => {
    if (isLoginRoute || session !== 'authorized') return
    Promise.all([api.adminListProperties(), api.listLeads()])
      .then(([properties, leads]) =>
        setCounts({
          properties: properties.length,
          inquiries: leads.filter((l) => l.status === 'new').length,
          media: properties.reduce((total, p) => total + p.media.length, 0),
        }),
      )
      .catch(() => undefined)
  }, [isLoginRoute, session, pathname])

  useEffect(() => {
    if (session === 'unauthorized' && !isLoginRoute) router.replace('/admin/login')
  }, [session, isLoginRoute, router])

  useEffect(() => {
    setNavOpen(false)
  }, [pathname])

  const logout = () => {
    api
      .logout()
      .catch(() => undefined)
      .finally(() => router.replace('/admin/login'))
  }

  if (isLoginRoute) return <>{children}</>

  const renderSidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <div className="px-6">
        <Link href="/" className="font-serif text-xl tracking-tight text-(--ink)">
          Platinum Properties
        </Link>
        <div className="mt-1 text-[9px] font-semibold uppercase tracking-[.22em] text-(--muted)">Admin workspace</div>
      </div>
      <nav className="mt-6 flex flex-col gap-1 px-3">
        {nav.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon
          const badge = item.count ? counts[item.count as keyof Counts] : 0
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                active ? 'bg-(--chip) text-(--ink)' : 'text-(--muted) hover:bg-(--chip)'
              }`}
            >
              <Icon size={16} className={active ? 'text-(--accent)' : ''} />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-(--accent) px-1.5 text-[11px] font-bold text-[#0b1f3a]">
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto border-t border-(--line) px-3 pt-5">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-(--muted) hover:bg-(--chip)"
        >
          View live site
        </Link>
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-(--muted) hover:bg-(--chip)"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col lg:flex-row">
      <aside className="hidden min-h-[calc(100vh-72px)] w-64 shrink-0 border-r border-(--line) py-8 lg:block">
        {renderSidebar()}
      </aside>

      {/* Off-canvas drawer for tablets and phones */}
      <AnimatePresence>
        {navOpen && (
          <motion.div
            key="nav"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div className="absolute inset-0 bg-[#060f1c]/50" onClick={() => setNavOpen(false)} aria-hidden="true" />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute inset-y-0 left-0 w-72 max-w-[80vw] border-r border-(--line) bg-(--bg) py-6 shadow-xl"
            >
              <button
                onClick={() => setNavOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-3 flex size-9 shrink-0 items-center justify-center rounded-full border border-(--line) text-(--muted)"
              >
                <X size={16} />
              </button>
              {renderSidebar(() => setNavOpen(false))}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact top bar for tablets and phones */}
      <div className="flex items-center gap-2 border-b border-(--line) px-4 py-3 lg:hidden">
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Open menu"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-(--line) text-(--muted)"
        >
          <Menu size={16} />
        </button>
        <Link href="/admin" className="truncate font-serif text-lg tracking-tight text-(--ink)">
          Platinum Properties
        </Link>
        <div className="flex-1" />
        <button
          onClick={logout}
          aria-label="Sign out"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-(--line) text-(--muted)"
        >
          <LogOut size={15} />
        </button>
      </div>

      <section className="min-w-0 flex-1 px-5 py-8 lg:px-10">
        {session === 'checking' || session === 'unauthorized' ? (
          <LoadingState />
        ) : (
          // Admin screens are work surfaces, so motion stops here: one short fade
          // per route change instead of scroll-linked reveals.
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        )}
      </section>
    </div>
  )
}
