'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, X, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

const icons = {
  success: Check,
  error: X,
  info: Info,
}

const styles = {
  success: 'bg-(--info-bg) text-(--info-fg) border-(--info-fg)',
  error: 'bg-(--danger-bg) text-(--danger-fg) border-(--danger-fg)',
  info: 'bg-(--chip) text-(--ink) border-(--line)',
}

let toastId = 0
const listeners = new Set<(toasts: Toast[]) => void>()
let toasts: Toast[] = []

function notifyListeners() {
  listeners.forEach((listener) => listener([...toasts]))
}

export function toast(type: ToastType, message: string, duration = 3000) {
  const id = `toast-${toastId++}`
  const newToast: Toast = { id, type, message }
  toasts = [...toasts, newToast]
  notifyListeners()

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    notifyListeners()
  }, duration)
}

export function success(message: string, duration?: number) {
  toast('success', message, duration)
}

export function error(message: string, duration?: number) {
  toast('error', message, duration)
}

export function info(message: string, duration?: number) {
  toast('info', message, duration)
}

export function ToastContainer() {
  const [localToasts, setLocalToasts] = useState<Toast[]>([])

  useEffect(() => {
    listeners.add(setLocalToasts)
    setLocalToasts([...toasts])
    return () => {
      listeners.delete(setLocalToasts)
    }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {localToasts.map((t) => {
          const Icon = icons[t.type]
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${styles[t.type]}`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{t.message}</span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
