import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calcFaltaEnvido, TRUCO_POINTS, ENVIDO_POINTS } from '../../utils/scoring'
import type { GameState, RoundMode } from '../../types/game'

interface ActionPanelProps {
  game: GameState
  onScore: (teamIndex: 0 | 1, points: number, reason: string) => void
}

type TabType = 'truco' | 'envido' | 'manual'

interface ScoreButtonProps {
  label: string
  sublabel?: string
  onClick: () => void
  color?: 'gold' | 'red' | 'green' | 'blue'
}

function ScoreButton({ label, sublabel, onClick, color = 'gold' }: ScoreButtonProps) {
  const colors = {
    gold: 'from-gold-600 to-gold-700 hover:from-gold-500 hover:to-gold-600 text-wood-900',
    red: 'from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 text-cream',
    green: 'from-green-800 to-green-900 hover:from-green-700 hover:to-green-800 text-cream',
    blue: 'from-blue-800 to-blue-900 hover:from-blue-700 hover:to-blue-800 text-cream',
  }
  return (
    <button
      onClick={onClick}
      className={`
        w-full py-3 px-3 rounded-xl font-display font-semibold text-sm
        bg-gradient-to-b ${colors[color]}
        transition-all active:scale-95 shadow-lg
        border border-white/10
      `}
    >
      <div>{label}</div>
      {sublabel && <div className="text-xs opacity-70 font-body font-normal">{sublabel}</div>}
    </button>
  )
}

function TeamSelector({
  teams,
  onSelect,
  points,
  onCancel,
}: {
  teams: [string, string]
  onSelect: (idx: 0 | 1) => void
  points: number
  onCancel: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-4 p-4 z-20"
      style={{ background: 'rgba(13,43,26,0.97)', backdropFilter: 'blur(8px)' }}
    >
      <p className="text-cream font-display text-lg text-center">
        ¿Quién suma{' '}
        <span className="text-gold-400 font-bold">+{points} pts</span>?
      </p>
      <div className="flex gap-3 w-full">
        {teams.map((name, i) => (
          <button
            key={i}
            onClick={() => onSelect(i as 0 | 1)}
            className="flex-1 py-3 rounded-xl font-display font-bold text-base
              bg-gradient-to-b from-gold-500 to-gold-700 text-wood-900
              active:scale-95 transition-all shadow-lg"
          >
            {name}
          </button>
        ))}
      </div>
      <button
        onClick={onCancel}
        className="text-parchment/50 text-sm underline underline-offset-2 hover:text-parchment/80"
      >
        Cancelar
      </button>
    </motion.div>
  )
}

export function ActionPanel({ game, onScore }: ActionPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('truco')
  const [pending, setPending] = useState<{ points: number; reason: string } | null>(null)


  const teamNames: [string, string] = [game.teams[0].name, game.teams[1].name]
  const roundMode: RoundMode = game.currentRoundMode

  function handleAction(points: number, reason: string) {
    setPending({ points, reason })
  }

  function handleSelectTeam(idx: 0 | 1) {
    if (!pending) return
    onScore(idx, pending.points, pending.reason)
    setPending(null)
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'truco', label: 'Truco' },
    { id: 'envido', label: 'Envido' },
    { id: 'manual', label: 'Manual' },
  ]

  // Falta Envido: we need to show dynamic points
  const faltaEnvidoFor = (teamIdx: 0 | 1) => {
    const loserIdx = teamIdx === 0 ? 1 : 0
    return calcFaltaEnvido(game.scores[loserIdx], game.scores[teamIdx], roundMode)
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(26,74,46,0.5) 0%, rgba(13,43,26,0.8) 100%)',
        border: '1px solid rgba(212,175,55,0.2)',
      }}
    >
      {/* Tabs */}
      <div
        className="flex"
        style={{ borderBottom: '1px solid rgba(212,175,55,0.2)' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm font-display font-semibold transition-all
              ${
                activeTab === tab.id
                  ? 'text-gold-400 border-b-2 border-gold-500'
                  : 'text-parchment/50 hover:text-parchment/80'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 relative min-h-[220px]">
        {/* Round mode badge */}
        {game.mode === '6players' && (
          <div className="flex justify-center mb-3">
            <span
              className={`text-xs px-3 py-1 rounded-full font-display font-bold tracking-widest uppercase
                ${roundMode === 'picapica'
                  ? 'bg-gold-700/40 text-gold-300 border border-gold-600/50'
                  : 'bg-felt-700/40 text-cream/60 border border-cream/20'
                }
              `}
            >
              {roundMode === 'picapica' ? '⚔ Pica-Pica' : '◈ Redondo'}
            </span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'truco' && (
            <motion.div
              key="truco"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="grid grid-cols-2 gap-2"
            >
              <ScoreButton
                label="Truco rechazado"
                sublabel="+1 pto"
                onClick={() => handleAction(TRUCO_POINTS.truco.refused, 'Truco (rechazado)')}
                color="red"
              />
              <ScoreButton
                label="Truco ganado"
                sublabel="+2 pts"
                onClick={() => handleAction(TRUCO_POINTS.truco.won, 'Truco')}
                color="gold"
              />
              <ScoreButton
                label="Retruco rechazado"
                sublabel="+2 pts"
                onClick={() => handleAction(TRUCO_POINTS.retruco.refused, 'Retruco (rechazado)')}
                color="red"
              />
              <ScoreButton
                label="Retruco ganado"
                sublabel="+3 pts"
                onClick={() => handleAction(TRUCO_POINTS.retruco.won, 'Retruco')}
                color="gold"
              />
              <ScoreButton
                label="Vale 4 rechazado"
                sublabel="+3 pts"
                onClick={() => handleAction(TRUCO_POINTS.vale4.refused, 'Vale cuatro (rechazado)')}
                color="red"
              />
              <ScoreButton
                label="Vale cuatro ganado"
                sublabel="+4 pts"
                onClick={() => handleAction(TRUCO_POINTS.vale4.won, 'Vale cuatro')}
                color="gold"
              />
            </motion.div>
          )}

          {activeTab === 'envido' && (
            <motion.div
              key="envido"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex flex-col gap-2"
            >
              <div className="grid grid-cols-2 gap-2">
                <ScoreButton
                  label="Envido rechazado"
                  sublabel="+1 pto"
                  onClick={() => handleAction(ENVIDO_POINTS.envido.refused, 'Envido (rechazado)')}
                  color="red"
                />
                <ScoreButton
                  label="Envido ganado"
                  sublabel="+2 pts"
                  onClick={() => handleAction(ENVIDO_POINTS.envido.won, 'Envido')}
                  color="green"
                />
                <ScoreButton
                  label="Real Envido rechazado"
                  sublabel="+2 pts"
                  onClick={() => handleAction(ENVIDO_POINTS.realenvido.refused, 'Real Envido (rechazado)')}
                  color="red"
                />
                <ScoreButton
                  label="Real Envido ganado"
                  sublabel="+3 pts"
                  onClick={() => handleAction(ENVIDO_POINTS.realenvido.won, 'Real Envido')}
                  color="green"
                />
              </div>

              {/* Falta Envido - needs team selection upfront to calculate */}
              <div
                className="rounded-xl p-3 mt-1"
                style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}
              >
                <p className="text-gold-400 text-xs font-display text-center mb-2 uppercase tracking-wider">
                  Falta Envido{roundMode === 'picapica' ? ' (Pica-Pica: siempre 6 pts)' : ''}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {teamNames.map((name, i) => {
                    const pts = faltaEnvidoFor(i as 0 | 1)
                    return (
                      <button
                        key={i}
                        onClick={() => onScore(i as 0 | 1, pts, 'Falta Envido')}
                        className="py-2 px-2 rounded-lg font-display font-bold text-sm
                          bg-gradient-to-b from-gold-600 to-gold-700 text-wood-900
                          active:scale-95 transition-all"
                      >
                        <div className="truncate text-xs">{name}</div>
                        <div className="text-lg">+{pts}</div>
                      </button>
                    )
                  })}
                </div>
                <p className="text-parchment/40 text-xs text-center mt-2">
                  Falta rechazada: la mitad de los pts de Falta ganada
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'manual' && (
            <motion.div
              key="manual"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex flex-col gap-3"
            >
              <p className="text-parchment/60 text-sm text-center font-body">
                Sumar un punto directamente a un equipo
              </p>
              <div className="grid grid-cols-2 gap-3">
                {teamNames.map((name, i) => (
                  <button
                    key={i}
                    onClick={() => onScore(i as 0 | 1, 1, 'Punto manual')}
                    className="py-4 rounded-xl font-display font-bold
                      bg-gradient-to-b from-gold-600 to-gold-700 text-wood-900
                      active:scale-95 transition-all shadow-lg"
                  >
                    <div className="text-sm truncate px-1">{name}</div>
                    <div className="text-2xl">+1</div>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {teamNames.map((name, i) => (
                  <button
                    key={i}
                    onClick={() => onScore(i as 0 | 1, 2, 'Punto manual')}
                    className="py-3 rounded-xl font-display font-semibold text-sm
                      bg-gradient-to-b from-felt-700 to-felt-800 text-cream/80
                      active:scale-95 transition-all border border-cream/10"
                  >
                    <div className="text-xs truncate px-1">{name}</div>
                    <div className="text-xl">+2</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Team selector overlay */}
        <AnimatePresence>
          {pending && (
            <TeamSelector
              teams={teamNames}
              points={pending.points}
              onSelect={handleSelectTeam}
              onCancel={() => setPending(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
