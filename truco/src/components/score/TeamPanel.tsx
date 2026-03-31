import { motion, AnimatePresence } from 'framer-motion'
import { splitScore, isInBuenas } from '../../utils/scoring'
import { PalitosDisplay } from './PalitosDisplay'
import type { Team, Player } from '../../types/game'
import { BUENAS_THRESHOLD } from '../../types/game'

interface TeamPanelProps {
  team: Team
  players: Player[]
  score: number
  isWinner?: boolean
  justScored?: boolean
  side?: 'left' | 'right'
}

export function TeamPanel({ team, players, score, isWinner, justScored, side: _side }: TeamPanelProps) {
  const { malas, buenas } = splitScore(score)
  const inBuenas = isInBuenas(score)

  return (
    <motion.div
      layout
      className={`relative flex flex-col rounded-2xl overflow-hidden
        ${isWinner ? 'animate-pulse-gold' : ''}
      `}
      style={{
        background: 'linear-gradient(160deg, rgba(26,74,46,0.6) 0%, rgba(13,43,26,0.9) 100%)',
        border: isWinner
          ? '2px solid rgba(212,175,55,0.8)'
          : inBuenas
          ? '2px solid rgba(45,106,26,0.7)'
          : '2px solid rgba(139,26,26,0.5)',
        boxShadow: isWinner
          ? '0 0 32px rgba(212,175,55,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
          : 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Winner banner */}
      <AnimatePresence>
        {isWinner && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gold-500 text-wood-900 text-center text-xs font-display font-bold py-1 tracking-widest uppercase"
          >
            ¡Ganadores!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 flex flex-col gap-3">
        {/* Team name */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-cream truncate">{team.name}</h2>
          <AnimatePresence>
            {justScored && (
              <motion.span
                key="scored"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="text-gold-400 text-xl font-bold"
              >
                +
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Players list */}
        {players.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {players.map((p) => (
              <span
                key={p.id}
                className="text-xs px-2 py-0.5 rounded-full text-parchment/80"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {p.name}
              </span>
            ))}
          </div>
        )}

        {/* Score total */}
        <motion.div
          key={score}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className="text-center"
        >
          <span
            className="font-display text-5xl font-bold tabular-nums"
            style={{ color: inBuenas ? '#7de07d' : '#e05a5a' }}
          >
            {score}
          </span>
          <span className="text-parchment/50 text-sm ml-1">/ 30</span>
        </motion.div>

        {/* Transition badge */}
        <AnimatePresence>
          {inBuenas && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <span className="text-xs font-display tracking-widest uppercase text-buenas/90 font-bold">
                ★ En Buenas ★
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Palitos */}
        <div className="flex flex-col gap-2">
          <PalitosDisplay
            score={malas}
            zone="malas"
            animateLastPoint={justScored && !inBuenas}
          />
          {(inBuenas || score >= BUENAS_THRESHOLD) && (
            <PalitosDisplay
              score={buenas}
              zone="buenas"
              animateLastPoint={justScored && inBuenas}
            />
          )}
        </div>
      </div>
    </motion.div>
  )
}
