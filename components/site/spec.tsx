'use client'

/** Small labelled statistic used across the public site. */
export function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-(--muted)">{label}</div>
      <div className="mt-1 font-semibold text-(--ink)">{value}</div>
    </div>
  )
}
