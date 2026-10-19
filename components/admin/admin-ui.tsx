'use client'

export function StatCard({
  label,
  value,
  icon: Icon,
  onClick,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ size?: number; className?: string }>
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-(--line) bg-(--card) p-5 text-left hover:border-(--accent)"
    >
      <Icon size={20} className="text-(--accent)" />
      <div className="mt-5 text-sm text-(--muted)">{label}</div>
      <div className="mt-1 font-serif text-3xl text-(--ink)">{value}</div>
    </button>
  )
}

export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-(--line) bg-(--card) p-10 text-center">
      <div className="font-serif text-2xl text-(--ink)">{title}</div>
      <p className="mt-2 text-sm text-(--muted)">{copy}</p>
    </div>
  )
}

export function LoadingState() {
  return <div className="py-16 text-center text-sm text-(--muted)">Loading…</div>
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-xl bg-(--danger-bg) px-4 py-3 text-sm text-(--danger-fg)">
      {message}
    </p>
  )
}

const badgeTones: Record<string, string> = {
  active: 'bg-(--chip) text-(--ink)',
  draft: 'bg-(--warn-bg) text-(--warn-fg)',
  archived: 'bg-(--danger-bg) text-(--danger-fg)',
  new: 'bg-(--chip) text-(--ink)',
  contacted: 'bg-(--info-bg) text-(--info-fg)',
  qualified: 'bg-(--warn-bg) text-(--warn-fg)',
  closed: 'bg-(--chip) text-(--muted)',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
        badgeTones[status] ?? 'bg-(--chip) text-(--muted)'
      }`}
    >
      {status || 'unknown'}
    </span>
  )
}

export function AdminPageHeader({
  title,
  copy,
  action,
}: {
  title: string
  copy: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-4xl tracking-tight text-(--ink)">{title}</h1>
        <p className="mt-1 text-sm text-(--muted)">{copy}</p>
      </div>
      {action}
    </div>
  )
}
