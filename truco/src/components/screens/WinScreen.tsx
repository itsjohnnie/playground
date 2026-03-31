import { motion } from 'framer-motion'
import type { GameState } from '../../types/game'
import { SuitsRow } from '../ui/SuitIcon'

interface WinScreenProps {
  game: GameState
  onFinish: () => void
}

const SUIT_SYMBOLS = ['♠', '♣', '♥', '♦']

function Confetti() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl"
          initial={{
            x: `${Math.random() * 100}vw`,
            y: -40,
            rotate: 0,
            opacity: 1,
          }}
          animate={{
            y: '110vh',
            rotate: (Math.random() - 0.5) * 720,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 1.5,
            ease: 'easeIn',
          }}
        >
          {SUIT_SYMBOLS[i % 4]}
        </motion.div>
      ))}
    </div>
  )
}

export function WinScreen({ game, onFinish }: WinScreenProps) {
  const winnerIdx = game.teams[0].id === game.winnerId ? 0 : 1
  const winner = game.teams[winnerIdx]
  const loser = game.teams[winnerIdx === 0 ? 1 : 0]
  const winnerScore = game.scores[winnerIdx]
  const loserScore = game.scores[winnerIdx === 0 ? 1 : 0]

  const winnerPlayers = game.players.filter((p) => p.teamId === winner.id)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative">
      <Confetti />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="flex flex-col items-center gap-6 z-10 max-w-sm w-full"
      >
        {/* Trophy */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-8xl"
        >
          🏆
        </motion.div>

        {/* Winner name */}
        <div className="text-center">
          <SuitsRow className="justify-center mb-2" />
          <h1 className="font-display text-5xl font-bold text-gold-400 leading-tight">
            {winner.name}
          </h1>
          <p className="font-display text-cream/60 text-xl mt-1">¡Ganaron el truco!</p>
        </div>

        {/* Players */}
        {winnerPlayers.length > 0 && (
          <div className="flex gap-2 flex-wrap justify-center">
            {winnerPlayers.map((p) => (
              <span
                key={p.id}
                className="px-3 py-1 rounded-full text-sm font-display text-wood-900 font-semibold"
                style={{ background: 'linear-gradient(to bottom, #D4AF37, #b8962e)' }}
              >
                {p.name}
              </span>
            ))}
          </div>
        )}

        {/* Score summary */}
        <div
          className="w-full rounded-2xl p-5 flex flex-col gap-3"
          style={{
            background: 'rgba(26,74,46,0.7)',
            border: '2px solid rgba(212,175,55,0.4)',
          }}
        >
          <p className="text-xs font-display tracking-widest uppercase text-parchment/40 text-center">
            Puntaje final
          </p>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <p className="font-display font-bold text-cream text-lg">{winner.name}</p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="font-display font-bold text-5xl text-gold-400"
              >
                {winnerScore}
              </motion.p>
            </div>
            <div className="text-parchment/30 font-display text-2xl font-bold">—</div>
            <div className="text-center">
              <p className="font-display font-bold text-cream/60 text-lg">{loser.name}</p>
              <p className="font-display font-bold text-4xl text-parchment/40">{loserScore}</p>
            </div>
          </div>
        </div>

        {/* History summary */}
        <div className="text-center text-xs text-parchment/40 font-body">
          {game.history.length} jugadas en esta partida
        </div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          onClick={onFinish}
          className="w-full py-4 rounded-2xl font-display font-bold text-lg
            bg-gradient-to-b from-gold-400 to-gold-600 text-wood-900
            shadow-xl active:scale-95 transition-all"
        >
          Nueva partida
        </motion.button>
      </motion.div>
    </div>
  )
}
