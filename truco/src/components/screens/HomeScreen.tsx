import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { SuitMark } from '@/components/ui/SuitMark'
import { Screen } from '@/components/ui/Screen'
import { InstallSheet } from '@/components/ui/InstallSheet'
import { useInstallState } from '@/hooks/useInstallState'
import type { Match, Player } from '@/types/game'

interface HomeScreenProps {
  /** Every match in play right now, oldest first. */
  liveMatches: Match[]
  playerById: (id: string) => Player | undefined
  rosterSize: number
  matchCount: number
  onContinue: (matchId: string) => void
  onNewMatch: () => void
  onMesa: () => void
  onHistorial: () => void
}

const stagger = (i: number) => ({ delay: i * 0.04 })

export function HomeScreen({
  liveMatches,
  playerById,
  rosterSize,
  matchCount,
  onContinue,
  onNewMatch,
  onMesa,
  onHistorial,
}: HomeScreenProps) {
  const reduced = useReducedMotion()
  const hasActiveMatch = liveMatches.length > 0
  const install = useInstallState()
  const [installOpen, setInstallOpen] = useState(false)
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
          {liveMatches.map((m, i) => (
            <LiveMatchCard
              key={m.id}
              match={m}
              playerById={playerById}
              /* Eight people split into two tables both default to
                 "Nosotros" and "Ellos", so with more than one card up
                 the team names alone can't tell you which table is
                 which. The line-up can. */
              showLineups={liveMatches.length > 1}
              reduced={!!reduced}
              index={i}
              onClick={() => onContinue(m.id)}
            />
          ))}

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...stagger(liveMatches.length), duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
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
            transition={{ ...stagger(liveMatches.length + 1), duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
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

      {/* Nothing to offer someone who already has it on their home
          screen — the hint was showing there too, which is where it
          reads as the app not knowing what it is. */}
      {!install.installed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.3 }}
          className="pt-6 flex justify-center"
        >
          <button
            type="button"
            onClick={() => setInstallOpen(true)}
            className="pressable text-center text-sm text-ink-soft text-balance underline decoration-ink-soft/40 underline-offset-4 hover:text-ink-muted"
          >
            Instalá la app para llevar tu propio marcador en cada mesa.
          </button>
        </motion.div>
      )}

      <InstallSheet
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        install={install}
      />
    </Screen>
  )
}

function LiveMatchCard({
  match, playerById, showLineups, reduced, index, onClick,
}: {
  match: Match
  playerById: (id: string) => Player | undefined
  showLineups: boolean
  reduced: boolean
  index: number
  onClick: () => void
}) {
  const names = (ids: string[]) =>
    ids.map((id) => playerById(id)?.name).filter(Boolean).join(', ')
  const lineA = names(match.teamA.playerIds)
  const lineB = names(match.teamB.playerIds)

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...stagger(index), duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
      aria-label={
        `Partida en juego, ${match.teamA.name} ${match.scoreA} a ` +
        `${match.teamB.name} ${match.scoreB}` +
        (showLineups && (lineA || lineB) ? `. ${lineA} contra ${lineB}` : '') +
        '. Tocá para volver.'
      }
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
        <span className="text-ink truncate">{match.teamA.name}</span>
        {/* text-sm to match the counts on the Mesa / Historial
            tiles below, which pair a 16px label with a 14px
            number. The card reads as the same kind of row, so
            it keeps the same relationship: names at body size,
            the score one step down. */}
        <span className="tabular text-sm font-medium text-ink shrink-0">
          {match.scoreA}
          <span className="text-ink-soft mx-1.5">—</span>
          {match.scoreB}
        </span>
        <span className="text-ink truncate text-right">{match.teamB.name}</span>
      </span>
      {showLineups && (lineA || lineB) && (
        /* aria-hidden: the label above already reads the line-ups out,
           and in the right order. */
        <span aria-hidden className="mt-1 flex items-baseline justify-between gap-3">
          <span className="text-xs text-ink-muted truncate">{lineA}</span>
          <span className="text-xs text-ink-muted truncate text-right">{lineB}</span>
        </span>
      )}
    </motion.button>
  )
}
