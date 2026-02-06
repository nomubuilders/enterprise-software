import { memo, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './Button'

interface ConfirmModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
}

export const ConfirmModal = memo(({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
}: ConfirmModalProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onCancel])

  const iconColor = variant === 'danger' ? 'text-red-400' : 'text-[var(--nomu-accent)]'
  const iconBg = variant === 'danger' ? 'bg-red-900/30' : 'bg-[var(--nomu-accent)]/10'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-sm mx-4 rounded-xl bg-[var(--nomu-surface)] shadow-2xl border border-[var(--nomu-border)]"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`shrink-0 rounded-full p-2 ${iconBg}`}>
                  <AlertTriangle size={20} className={iconColor} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[var(--nomu-text)]">{title}</h3>
                  <p className="mt-1 text-sm text-[var(--nomu-text-muted)]">{message}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--nomu-border)] px-6 py-4">
              <Button variant="secondary" size="sm" onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button variant={variant === 'danger' ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
})

ConfirmModal.displayName = 'ConfirmModal'
