'use client'

import { motion } from 'motion/react'

/** Full-screen backdrop dialog shell shared by the public site. */
export function Overlay({ children, close }: { children: React.ReactNode; close: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0b1f3a]/50 backdrop-blur-sm sm:items-center sm:p-6"
    >
      {children}
    </motion.div>
  )
}

/**
 * The card inside an Overlay. Rises in on open and settles back down on close;
 * the exit only plays when the dialog is unmounted inside <AnimatePresence>.
 */
export function OverlayPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.9 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
