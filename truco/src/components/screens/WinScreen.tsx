import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { SuitMark } from '@/components/ui/SuitMark'
import { Screen } from '@/components/ui/Screen'
import { useEdgeSwipeBack } from '@/hooks/useEdgeSwipeBack'
import type { Match, Player } from '@/types/game'

interface WinScreenProps {
  match: Match
  playerById: (id: string) => Player | undefined
  onHome: () => void
  onRevancha: () => void
}

const COUNT_DURATION = 600

export function WinScreen({ match, playerById, onHome, onRevancha }: WinScreenProps) {
  useEdgeSwipeBack(onHome)
  const winnerSide = match.winner
  if (winnerSide === null) return null

  const winnerTeam = winnerSide === 'A' ? match.teamA : match.teamB
  const loserTeam = winnerSide === 'A' ? match.teamB : match.teamA
  const winnerScore = winnerSide === 'A' ? match.scoreA : match.scoreB
  const loserScore = winnerSide === 'A' ? match.scoreB : match.scoreA
  const winnerPlayers = winnerTeam.playerIds.map(playerById).filter(Boolean) as Player[]

  const duration = match.finishedAt && match.startedAt
    ? Math.max(1, Math.round((match.finishedAt - match.startedAt) / 60000))
    : null

  return (
    <Screen className="px-5 py-8 items-center justify-center text-center gap-6">
      <SuitMark className="opacity-80" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: 0.05 }}
        className="flex flex-col items-center gap-2"
      >
        <p className="eyebrow">Ganaron</p>
        <h1
          className="font-display font-normal text-ink leading-[0.95]"
          style={{ fontSize: 'var(--fs-display-xl)' }}
        >
          {winnerTeam.name}
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.18 }}
        className="flex items-baseline gap-3 font-display tabular text-ink"
      >
        <CountUp to={winnerScore} className="text-h1 text-accent" />
        <span className="text-ink-soft">—</span>
        <CountUp to={loserScore} className="text-h1 text-ink-muted" />
      </motion.div>

      {winnerPlayers.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.28 }}
          className="text-ink-muted"
        >
          {winnerPlayers.map((p) => p.name).join(' · ')}
        </motion.p>
      )}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.34 }}
        className="text-sm text-ink-soft tabular"
      >
        {duration ? `Duración ${duration} min` : ''}
        {duration ? ' · ' : ''}
        {match.events.length} jugadas
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.42, ease: [0.23, 1, 0.32, 1] }}
        className="flex flex-col gap-3 w-full max-w-xs pt-4"
      >
        <Button variant="primary" size="lg" onClick={onHome}>
          Guardar y volver
        </Button>
        <Button variant="ghost" size="lg" onClick={onRevancha}>
          Revancha
        </Button>
        <p className="text-[11px] text-ink-soft">
          Mismos equipos · {loserTeam.name} sale primero
        </p>
      </motion.div>
    </Screen>
  )
}

function CountUp({ to, className }: { to: number; className?: string }) {
  const [n, setN] = useState(0)
  const startedAt = useRef<number | null>(null)
  useEffect(() => {
    let raf = 0
    const tick = (ts: number) => {
      if (startedAt.current === null) startedAt.current = ts
      const t = Math.min(1, (ts - startedAt.current) / COUNT_DURATION)
      const eased = 1 - Math.pow(1 - t, 3)
      setN(Math.round(eased * to))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <span className={className}>{n}</span>
}
