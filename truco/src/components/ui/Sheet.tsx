import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

const SHEET_SPRING = { type: 'spring' as const, duration: 0.5, bounce: 0.18 }

export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SHEET_SPRING}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              const v = Math.abs(info.velocity.y) / 1000
              if (info.offset.y > 80 || v > 0.11) onClose()
            }}
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[480px]',
              'rounded-t-xl bg-surface border-t border-line shadow-3',
              'pb-[max(env(safe-area-inset-bottom),16px)]',
              className,
            )}
          >
            <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="h-1 w-10 rounded-full bg-ink/15" />
            </div>
            <div className="flex items-center justify-between px-5 pb-2 pt-1">
              {title ? (
                <h3 className="font-display text-h2 text-ink">{title}</h3>
              ) : <div />}
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="pressable rounded-sm p-2 text-ink-muted hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="px-5 pb-3">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
