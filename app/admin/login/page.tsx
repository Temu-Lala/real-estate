'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/api'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.login(email.trim(), password)
      router.replace('/admin')
    } catch {
      setError('Invalid credentials. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-(--bg) px-5">
      <div className="w-full max-w-md rounded-[28px] border border-(--line) bg-(--card) p-8 sm:p-10">
        <div className="text-xs font-bold uppercase tracking-[.2em] text-(--accent)">Platinum Properties</div>
        <h1 className="mt-2 font-serif text-4xl text-(--ink)">Admin sign in</h1>
        <p className="mt-3 text-sm leading-6 text-(--muted)">
          Manage listings, media, and customer inquiries. Access is restricted to workspace administrators.
        </p>
        <form onSubmit={submit} className="mt-8 grid gap-4">
          <label>
            <span className="mb-1 block text-xs font-semibold text-(--muted)">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              className="w-full rounded-xl border border-(--line) px-4 py-3 outline-none"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-(--muted)">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-xl border border-(--line) px-4 py-3 outline-none"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-(--danger-fg)">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="rounded-full bg-(--ink-solid) px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
