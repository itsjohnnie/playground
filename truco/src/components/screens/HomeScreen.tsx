import { motion } from 'framer-motion'
import type { SavedMatch } from '../../types/game'
import { SuitsRow } from '../ui/SuitIcon'

interface HomeScreenProps {
  history: SavedMatch[]
  hasActiveGame: boolean
  onNewGame: () => void
  onContinue: () => void
  onClearHistory: () => void
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HomeScreen({
  history,
  hasActiveGame,
  onNewGame,
  onContinue,
  onClearHistory,
}: HomeScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 gap-6">
      {/* Header */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center gap-2 pt-4"
      >
        <SuitsRow className="justify-center opacity-60" />
        <h1 className="font-display text-5xl font-bold text-gold-400 text-center leading-tight">
          Truco
        </h1>
        <p className="font-display text-cream/60 text-base tracking-widest uppercase">
          Argentino
        </p>
        <SuitsRow className="justify-center opacity-60" />
      </motion.div>

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="flex flex-col gap-3 w-full max-w-sm"
      >
        {hasActiveGame && (
          <button
            onClick={onContinue}
            className="w-full py-4 rounded-2xl font-display font-bold text-lg
              bg-gradient-to-b from-gold-400 to-gold-600 text-wood-900
              shadow-xl active:scale-95 transition-all animate-pulse-gold"
          >
            Continuar partida
          </button>
        )}
        <button
          onClick={onNewGame}
          className={`w-full py-4 rounded-2xl font-display font-bold text-lg
            transition-all active:scale-95 shadow-lg
            ${hasActiveGame
              ? 'bg-gradient-to-b from-felt-700 to-felt-900 text-cream/80 border border-cream/20'
              : 'bg-gradient-to-b from-gold-400 to-gold-600 text-wood-900 shadow-xl animate-pulse-gold'
            }
          `}
        >
          Nueva partida
        </button>
      </motion.div>

      {/* Decorative divider */}
      <div className="flex items-center gap-3 w-full max-w-sm">
        <div className="flex-1 h-px bg-gold-700/30" />
        <span className="text-gold-700/50 text-xs font-display tracking-widest uppercase">Historial</span>
        <div className="flex-1 h-px bg-gold-700/30" />
      </div>

      {/* History */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm flex flex-col gap-2"
      >
        {history.length === 0 ? (
          <p className="text-center text-parchment/30 font-body text-sm py-4">
            Todavía no hay partidas jugadas
          </p>
        ) : (
          <>
            {history.slice(0, 10).map((match, i) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{
                  background: 'rgba(26,74,46,0.4)',
                  border: '1px solid rgba(212,175,55,0.15)',
                }}
              >
                <div>
                  <p className="text-cream text-sm font-display font-semibold">
                    🏆 <span className="text-gold-400">{match.winnerName}</span>
                  </p>
                  <p className="text-parchment/50 text-xs mt-0.5">
                    {match.teamNames[0]} {match.finalScores[0]} — {match.finalScores[1]} {match.teamNames[1]}
                  </p>
                  <p className="text-parchment/30 text-xs">{formatDate(match.startedAt)}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full text-parchment/50"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {match.mode === '4players' ? '4' : '6'} jug.
                </span>
              </motion.div>
            ))}
            <button
              onClick={onClearHistory}
              className="text-xs text-parchment/30 underline underline-offset-2 text-center pt-1 hover:text-parchment/60"
            >
              Borrar historial
            </button>
          </>
        )}
      </motion.div>
    </div>
  )
}
