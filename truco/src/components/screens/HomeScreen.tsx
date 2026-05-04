import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { SuitMark } from '@/components/ui/SuitMark'
import { Screen } from '@/components/ui/Screen'

interface HomeScreenProps {
  hasActiveMatch: boolean
  rosterSize: number
  matchCount: number
  onContinue: () => void
  onNewMatch: () => void
  onMesa: () => void
  onHistorial: () => void
}

const stagger = (i: number) => ({ delay: i * 0.04 })

export function HomeScreen({
  hasActiveMatch,
  rosterSize,
  matchCount,
  onContinue,
  onNewMatch,
  onMesa,
  onHistorial,
}: HomeScreenProps) {
  return (
    <Screen className="px-5 pb-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="flex flex-col items-center pt-20 pb-12 gap-3"
      >
        <SuitMark className="mb-1 opacity-90" />
        <h1
          className="font-display font-normal leading-none text-ink"
          style={{ fontSize: 'var(--fs-display-xl)' }}
        >
          Truco
        </h1>
        <p className="eyebrow">Argentino</p>
      </motion.div>

      {/* Primary CTAs */}
      <div className="flex flex-col gap-3">
        {hasActiveMatch && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...stagger(0), duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
          >
            <Button variant="primary" size="xl" className="w-full" onClick={onContinue}>
              Continuar partida
            </Button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...stagger(1), duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
        >
          <Button
            variant={hasActiveMatch ? 'outline' : 'primary'}
            size="xl"
            className="w-full"
            onClick={onNewMatch}
          >
            Nueva partida
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...stagger(2), duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
          className="grid grid-cols-2 gap-3"
        >
          <Button variant="ghost" size="lg" className="w-full justify-between" onClick={onMesa}>
            <span>Mesa</span>
            <span className="tabular text-ink-muted text-sm">{rosterSize}</span>
          </Button>
          <Button variant="ghost" size="lg" className="w-full justify-between" onClick={onHistorial}>
            <span>Historial</span>
            <span className="tabular text-ink-muted text-sm">{matchCount}</span>
          </Button>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.3 }}
        className="mt-auto pt-10 text-center text-sm text-ink-soft"
      >
        Instalá la app para llevar tu propio marcador en cada mesa.
      </motion.p>
    </Screen>
  )
}
