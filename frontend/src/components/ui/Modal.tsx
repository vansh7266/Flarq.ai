import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../utils/helpers'
import { Button } from './Button'

export interface ModalProps {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
  className?: string
}

export function Modal({ open, title, onClose, children, className }: ModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      return
    }
    const focusable = modalRef.current?.querySelector(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement | null
    focusable?.focus()
  }, [open])

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            ref={modalRef}
            className={cn(
              'relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-soft',
              className
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              {title ? (
                <h2 className="font-display text-lg font-semibold tracking-tight text-text">
                  {title}
                </h2>
              ) : (
                <span />
              )}
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-9 shrink-0 p-0"
                aria-label="Close dialog"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
