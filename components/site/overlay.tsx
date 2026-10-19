'use client'

/** Full-screen backdrop dialog shell shared by the public site. */
export function Overlay({ children, close }: { children: React.ReactNode; close: () => void }) {
  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0b1f3a]/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
    >
      {children}
    </div>
  )
}
