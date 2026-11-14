'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle } from 'lucide-react'
import { Overlay } from '@/components/site/overlay'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setIsConfirming(false)
    }
  }

  const variantStyles = {
    danger: 'bg-(--danger-fg) text-white hover:brightness-110',
    warning: 'bg-(--warn-fg) text-white hover:brightness-110',
    info: 'bg-(--accent) text-[#0b1f3a] hover:brightness-110',
  }

  return (
    <Overlay close={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-2xl bg-(--card) p-6 shadow-2xl"
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
              variant === 'danger' ? 'bg-(--danger-bg)' : variant === 'warning' ? 'bg-(--warn-bg)' : 'bg-(--chip)'
            }`}
          >
            <AlertTriangle
              size={20}
              className={
                variant === 'danger'
                  ? 'text-(--danger-fg)'
                  : variant === 'warning'
                    ? 'text-(--warn-fg)'
                    : 'text-(--accent)'
              }
            />
          </div>
          <div className="flex-1">
            <h3 className="font-serif text-xl text-(--ink)">{title}</h3>
            <p className="mt-2 text-sm text-(--muted)">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="rounded-full border border-(--line) px-5 py-2.5 text-sm font-semibold text-(--muted) hover:bg-(--chip) disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold ${variantStyles[variant]} disabled:opacity-50`}
          >
            {isConfirming ? 'Processing...' : confirmText}
          </button>
        </div>
      </motion.div>
    </Overlay>
  )
}
