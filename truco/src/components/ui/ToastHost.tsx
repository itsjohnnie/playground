import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { subscribeToast, type ToastMsg } from '@/lib/toast'

export function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([])

  useEffect(() => {
    return subscribeToast((m) => {
      setItems((cur) => [...cur, m])
      if (m.ttl > 0) {
        window.setTimeout(() => {
          setItems((cur) => cur.filter((x) => x.id !== m.id))
        }, m.ttl)
      }
    })
  }, [])

  function dismiss(id: number) {
    setItems((cur) => cur.filter((x) => x.id !== id))
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-3"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
    >
      <AnimatePresence initial={false}>
        {items.map((m) => (
          <motion.div
            key={m.id}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12, transition: { duration: 0.16 } }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            onClick={() => dismiss(m.id)}
            className={[
              'pointer-events-auto inline-flex max-w-[440px] items-center gap-2 rounded-sm border px-3 py-2 text-sm shadow-2',
              'backdrop-blur-md backdrop-saturate-150',
              m.kind === 'error' && 'border-danger/25 bg-danger/20 text-ink',
              m.kind === 'success' && 'border-win/25 bg-win/22 text-ink',
              m.kind === 'info' && 'border-line/60 bg-surface-hi/75 text-ink',
            ].filter(Boolean).join(' ')}
          >
            {m.kind === 'error' && <AlertTriangle className="size-4 text-danger" />}
            {m.kind === 'success' && <CheckCircle2 className="size-4 text-win" />}
            {m.kind === 'info' && <Info className="size-4 text-ink-muted" />}
            <span className="flex-1">{m.text}</span>
            <X className="size-3.5 opacity-60" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
