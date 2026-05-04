import { motion, AnimatePresence } from 'framer-motion'
import { splitScore, isInBuenas } from '@/utils/scoring'
import { PalitosDisplay } from './PalitosDisplay'
import { Badge } from '@/components/ui/badge'
import type { Team, Player } from '@/types/game'
import { BUENAS_THRESHOLD } from '@/types/game'

interface TeamPanelProps {
  team: Team
  players: Player[]
  score: number
  isLeading: boolean
  lastScored: boolean
}

export function TeamPanel({ team, players, score, isLeading, lastScored }: TeamPanelProps) {
  const { malas, buenas } = splitScore(score)
  const inBuenas = isInBuenas(score)

  return (
    <div className="flex flex-col gap-3 py-4 px-3">
      {/* Team name + players */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-display tracking-[0.2em] uppercase font-semibold text-gold/70">
          {team.name}
        </span>
        {players.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {players.map((p) => (
              <span
                key={p.id}
                className="text-[10px] text-foreground/40 font-body"
              >
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Score — the hero number */}
      <div className="flex items-baseline gap-1.5">
        <motion.span
          key={score}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          className="font-display font-bold tabular-nums leading-none"
          style={{
            fontSize: 'clamp(48px, 14vw, 72px)',
            color: inBuenas ? '#70c080' : '#F5E6C8',
          }}
        >
          {score}
        </motion.span>
        <span className="text-foreground/20 text-sm font-display">/30</span>
      </div>

      {/* Zone badge */}
      <AnimatePresence>
        {inBuenas && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <Badge variant="buenas">★ Buenas</Badge>
          </motion.div>
        )}
        {isLeading && !inBuenas && score > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <Badge variant="gold">va ganando</Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Palitos */}
      <div className="flex flex-col gap-3 mt-1">
        <PalitosDisplay
          score={malas}
          zone="malas"
          lastScored={lastScored && !inBuenas}
        />
        {score >= BUENAS_THRESHOLD && (
          <PalitosDisplay
            score={buenas}
            zone="buenas"
            lastScored={lastScored && inBuenas}
          />
        )}
      </div>
    </div>
  )
}
