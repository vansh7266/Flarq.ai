import { useEffect, type ReactNode } from 'react'
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

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
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
              className={cn(
              'relative w-full max-w-lg rounded-2xl border border-border bg-white p-6 shadow-soft',
              className
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              {title ? (
                <h2 className="text-lg font-semibold tracking-tight text-text-primary">
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
