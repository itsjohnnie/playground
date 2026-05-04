import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { GameState } from '@/types/game'

const SUITS = ['♠', '♣', '♥', '♦']
const SUIT_COLORS = ['#e8f0fe', '#c8e6c9', '#ffcdd2', '#fff9c4']

function ConfettiPiece({ delay }: { delay: number }) {
  const suit = SUITS[Math.floor(Math.random() * 4)]
  const suitIdx = SUITS.indexOf(suit)
  const left = `${Math.random() * 100}%`
  const size = 16 + Math.random() * 12

  return (
    <motion.div
      className="fixed pointer-events-none select-none font-display"
      style={{ left, top: -30, fontSize: size, color: SUIT_COLORS[suitIdx], zIndex: 60 }}
      initial={{ y: 0, rotate: 0, opacity: 1 }}
      animate={{ y: '110vh', rotate: (Math.random() - 0.5) * 540, opacity: [1, 1, 0] }}
      transition={{ duration: 2.2 + Math.random() * 1.5, delay, ease: 'easeIn' }}
    >
      {suit}
    </motion.div>
  )
}

export function WinScreen({ game, onFinish }: { game: GameState; onFinish: () => void }) {
  const winnerIdx = game.teams[0].id === game.winnerId ? 0 : 1
  const winner = game.teams[winnerIdx]
  const loser = game.teams[winnerIdx === 0 ? 1 : 0]
  const winnerScore = game.scores[winnerIdx]
  const loserScore = game.scores[winnerIdx === 0 ? 1 : 0]
  const winnerPlayers = game.players.filter((p) => p.teamId === winner.id)

  // 18 confetti pieces with staggered delays
  const pieces = useRef(Array.from({ length: 18 }, (_, i) => i * 0.08))

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-5 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a2015 0%, #0d2b1a 100%)' }}>

      {/* Confetti */}
      {pieces.current.map((delay, i) => <ConfettiPiece key={i} delay={delay} />)}

      <div className="flex flex-col items-center gap-6 z-10 max-w-sm w-full">
        {/* Trophy */}
        <motion.div
          initial={{ scale: 0.3, opacity: 0, rotate: -15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className="text-7xl"
        >
          🏆
        </motion.div>

        {/* Winner name */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: 0.25 }}
          className="text-center"
        >
          <div className="flex justify-center gap-2 text-gold/40 text-base mb-2">
            <span>♠</span><span>♣</span><span>♥</span><span>♦</span>
          </div>
          <h1 className="font-display text-5xl font-black text-foreground leading-tight">
            {winner.name}
          </h1>
          <p className="font-display text-muted-foreground text-lg mt-1">¡Ganaron!</p>
        </motion.div>

        {/* Players */}
        {winnerPlayers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-2"
          >
            {winnerPlayers.map((p) => (
              <span key={p.id} className="px-3 py-1 rounded-full text-sm font-display text-[#2c1a0a] font-semibold"
                style={{ background: 'linear-gradient(to bottom, #D4AF37, #b8962e)' }}>
                {p.name}
              </span>
            ))}
          </motion.div>
        )}

        {/* Score card */}
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1], delay: 0.35 }}
          className="w-full rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.3)' }}
        >
          <div className="flex items-center justify-around">
            <div className="text-center">
              <p className="text-xs font-display text-muted-foreground uppercase tracking-widest mb-1">
                {winner.name}
              </p>
              <p className="font-display font-black text-5xl text-[#D4AF37]">{winnerScore}</p>
            </div>
            <p className="text-2xl text-foreground/20 font-display">—</p>
            <div className="text-center">
              <p className="text-xs font-display text-muted-foreground uppercase tracking-widest mb-1">
                {loser.name}
              </p>
              <p className="font-display font-black text-4xl text-foreground/40">{loserScore}</p>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3">
            {game.history.length} jugadas registradas
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="w-full"
        >
          <Button variant="gold" size="xl" className="w-full font-display font-bold text-lg" onClick={onFinish}>
            Nueva partida
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
