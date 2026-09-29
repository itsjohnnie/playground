import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { SuitMark } from '@/components/ui/SuitMark'
import { Screen } from '@/components/ui/Screen'
import type { Match } from '@/types/game'

interface HomeScreenProps {
  /** The match currently being played, if any. Null once it's won. */
  activeMatch: Match | null
  rosterSize: number
  matchCount: number
  onContinue: () => void
  onNewMatch: () => void
  onMesa: () => void
  onHistorial: () => void
}

const stagger = (i: number) => ({ delay: i * 0.04 })

export function HomeScreen({
  activeMatch,
  rosterSize,
  matchCount,
  onContinue,
  onNewMatch,
  onMesa,
  onHistorial,
}: HomeScreenProps) {
  const reduced = useReducedMotion()
  const hasActiveMatch = activeMatch !== null
  return (
    <Screen className="px-5 pb-6">
      <div className="flex-1 flex flex-col justify-center gap-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col items-center gap-3"
        >
          <SuitMark className="mb-1 opacity-90" />
          <h1
            className="font-display text-display-xl font-normal leading-none text-ink text-center text-balance"
          >
            <span className="block">Monday’s</span>
            <span className="block">Truco League</span>
          </h1>
          <p className="eyebrow">Argentino</p>
        </motion.div>

        {/* Primary CTAs */}
        <div className="flex flex-col gap-3">
          {activeMatch && (
            <motion.button
              type="button"
              onClick={onContinue}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...stagger(0), duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
              aria-label={`Partida en juego, ${activeMatch.teamA.name} ${activeMatch.scoreA} a ${activeMatch.teamB.name} ${activeMatch.scoreB}. Tocá para volver.`}
              className="pressable w-full rounded-md border border-accent/50 bg-accent/10 px-4 py-3 text-left hover-elevate"
            >
              <span className="flex items-center gap-2">
                {/* Breathing dot — the match is live right now, and a
                    static label reads like a leftover from last week. */}
                <motion.span
                  aria-hidden
                  className="size-1.5 rounded-full bg-accent shrink-0"
                  animate={reduced ? {} : { opacity: [1, 0.35, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="eyebrow text-accent">Partida en juego</span>
              </span>
              <span className="mt-2 flex items-baseline justify-between gap-3">
                <span className="font-display text-ink truncate">{activeMatch.teamA.name}</span>
                {/* text-sm to match the counts on the Mesa / Historial
                    tiles below, which pair a 16px label with a 14px
                    number. The card reads as the same kind of row, so
                    it keeps the same relationship: names at body size,
                    the score one step down. */}
                <span className="tabular text-sm font-medium text-ink shrink-0">
                  {activeMatch.scoreA}
                  <span className="text-ink-soft mx-1.5">—</span>
                  {activeMatch.scoreB}
                </span>
                <span className="font-display text-ink truncate text-right">{activeMatch.teamB.name}</span>
              </span>
            </motion.button>
          )}

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...stagger(1), duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
          >
            <Button
              variant={hasActiveMatch ? 'outline' : 'primary'}
              size="lg"
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
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.3 }}
        className="pt-6 text-center text-sm text-ink-soft text-balance"
      >
        Instalá la app para llevar tu propio marcador en cada mesa.
      </motion.p>
    </Screen>
  )
}
