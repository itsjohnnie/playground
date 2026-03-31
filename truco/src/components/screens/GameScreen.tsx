import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GameState } from '../../types/game'
import { TeamPanel } from '../score/TeamPanel'
import { ActionPanel } from '../actions/ActionPanel'


interface GameScreenProps {
  game: GameState
  onScore: (teamIndex: 0 | 1, points: number, reason: string) => void
  onUndo: () => void
  onAbandon: () => void
}

export function GameScreen({ game, onScore, onUndo, onAbandon }: GameScreenProps) {
  const [lastScoredTeam, setLastScoredTeam] = useState<0 | 1 | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleScore(teamIndex: 0 | 1, points: number, reason: string) {
    onScore(teamIndex, points, reason)
    setLastScoredTeam(teamIndex)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setLastScoredTeam(null), 1500)
  }

  const modeLabel = game.mode === '4players' ? '2 vs 2' : '3 vs 3'
  const roundModeLabel =
    game.mode === '6players'
      ? game.currentRoundMode === 'picapica'
        ? '⚔ Pica-Pica'
        : '◈ Redondo'
      : null

  const lastEntry = game.history[game.history.length - 1]

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{
          background: 'rgba(13,43,26,0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(212,175,55,0.15)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-gold-500 text-lg">Truco</span>
          <span className="text-parchment/40 text-xs">{modeLabel}</span>
          {roundModeLabel && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-display font-bold
                ${game.currentRoundMode === 'picapica'
                  ? 'bg-gold-700/30 text-gold-400 border border-gold-600/40'
                  : 'bg-felt-700/30 text-cream/50 border border-cream/15'
                }
              `}
            >
              {roundModeLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="text-parchment/50 text-xs px-2 py-1 rounded-lg hover:text-parchment/80
              border border-cream/10 hover:border-cream/20 transition-all"
          >
            Historial
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-parchment/50 hover:text-parchment/80 text-xl leading-none px-1"
          >
            ⋮
          </button>
        </div>
      </div>

      {/* Menu dropdown */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-14 right-4 z-20 rounded-xl overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(26,74,46,0.98)',
              border: '1px solid rgba(212,175,55,0.25)',
              backdropFilter: 'blur(12px)',
              minWidth: 180,
            }}
          >
            <button
              onClick={() => { onUndo(); setShowMenu(false) }}
              disabled={game.history.length === 0}
              className="w-full px-4 py-3 text-left text-sm font-body text-cream/80
                hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ↩ Deshacer último punto
            </button>
            <div className="h-px bg-cream/10" />
            <button
              onClick={() => { setConfirmAbandon(true); setShowMenu(false) }}
              className="w-full px-4 py-3 text-left text-sm font-body text-red-400 hover:bg-white/5 transition-all"
            >
              ✕ Abandonar partida
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop for menu */}
      {showMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
      )}

      <div className="flex-1 flex flex-col gap-4 px-4 py-4">
        {/* Score boards */}
        <div className="grid grid-cols-2 gap-3">
          {game.teams.map((team, i) => (
            <TeamPanel
              key={team.id}
              team={team}
              players={game.players.filter((p) => p.teamId === team.id)}
              score={game.scores[i]}
              justScored={lastScoredTeam === i}
              side={i === 0 ? 'left' : 'right'}
            />
          ))}
        </div>

        {/* Last action badge */}
        <AnimatePresence>
          {lastEntry && (
            <motion.div
              key={lastEntry.timestamp}
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <span
                className="text-xs px-3 py-1 rounded-full text-parchment/60 font-body"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {game.teams.find((t) => t.id === lastEntry.teamId)?.name} — {lastEntry.reason} (+{lastEntry.points})
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action panel */}
        <ActionPanel game={game} onScore={handleScore} />
      </div>

      {/* Confirm abandon modal */}
      <AnimatePresence>
        {confirmAbandon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-2xl p-6 flex flex-col gap-4 max-w-xs w-full"
              style={{
                background: 'rgba(26,74,46,0.98)',
                border: '1px solid rgba(212,175,55,0.3)',
              }}
            >
              <h2 className="font-display text-xl font-bold text-cream text-center">
                ¿Abandonar partida?
              </h2>
              <p className="text-parchment/60 text-sm text-center font-body">
                Se perderán los puntos actuales. La partida no se guardará en el historial.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAbandon(false)}
                  className="flex-1 py-3 rounded-xl font-display font-semibold text-sm
                    bg-felt-800/80 text-cream/70 border border-cream/20 active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { onAbandon(); setConfirmAbandon(false) }}
                  className="flex-1 py-3 rounded-xl font-display font-semibold text-sm
                    bg-gradient-to-b from-red-800 to-red-900 text-cream active:scale-95 transition-all"
                >
                  Abandonar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-md rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto"
              style={{
                background: 'rgba(13,43,26,0.98)',
                border: '1px solid rgba(212,175,55,0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-gold-400">Jugadas de esta partida</h3>
                <button onClick={() => setShowHistory(false)} className="text-parchment/50 text-xl">✕</button>
              </div>
              {game.history.length === 0 ? (
                <p className="text-parchment/40 text-sm text-center py-4">Sin jugadas aún</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {[...game.history].reverse().map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <span className="text-parchment/70">
                        {game.teams.find((t) => t.id === entry.teamId)?.name}
                      </span>
                      <span className="text-parchment/50 text-xs">{entry.reason}</span>
                      <span className="text-gold-400 font-bold">+{entry.points}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
