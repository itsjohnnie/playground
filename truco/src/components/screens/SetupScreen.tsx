import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GameMode } from '../../types/game'

interface SetupScreenProps {
  onStart: (mode: GameMode, teamNames: [string, string], playerNames: string[]) => void
  onBack: () => void
}

const PLACEHOLDER_NAMES_4 = ['Rulo', 'Coco', 'Titi', 'Nacho']
const PLACEHOLDER_NAMES_6 = ['Rulo', 'Coco', 'Titi', 'Nacho', 'Luli', 'Seba']

export function SetupScreen({ onStart, onBack }: SetupScreenProps) {
  const [mode, setMode] = useState<GameMode>('4players')
  const [teamNames, setTeamNames] = useState<[string, string]>(['Nosotros', 'Ellos'])
  const [playerNames, setPlayerNames] = useState<string[]>(['', '', '', ''])

  const playersPerTeam = mode === '4players' ? 2 : 3
  const totalPlayers = playersPerTeam * 2
  const placeholders = mode === '4players' ? PLACEHOLDER_NAMES_4 : PLACEHOLDER_NAMES_6

  function handleModeChange(m: GameMode) {
    setMode(m)
    setPlayerNames(Array(m === '4players' ? 4 : 6).fill(''))
  }

  function updatePlayer(idx: number, value: string) {
    const updated = [...playerNames]
    updated[idx] = value
    setPlayerNames(updated)
  }

  function handleStart() {
    // Filter out blank names
    const names = playerNames.map((n, i) => n.trim() || placeholders[i])
    onStart(mode, teamNames, names)
  }

  const canStart =
    teamNames[0].trim().length > 0 && teamNames[1].trim().length > 0

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 gap-5 max-w-md mx-auto">
      {/* Back */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onBack}
        className="self-start text-parchment/50 text-sm flex items-center gap-1 hover:text-parchment/80"
      >
        ← Volver
      </motion.button>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-3xl font-bold text-gold-400"
      >
        Nueva Partida
      </motion.h1>

      {/* Mode selector */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col gap-2"
      >
        <label className="text-xs font-display tracking-widest uppercase text-parchment/50">
          Modalidad
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['4players', '6players'] as GameMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`py-3 rounded-xl font-display font-bold text-sm transition-all active:scale-95
                ${mode === m
                  ? 'bg-gradient-to-b from-gold-500 to-gold-700 text-wood-900 shadow-lg'
                  : 'bg-felt-800/60 text-parchment/60 border border-cream/10'
                }
              `}
            >
              <div className="text-lg">{m === '4players' ? '4' : '6'}</div>
              <div className="text-xs font-body">{m === '4players' ? '2 vs 2' : '3 vs 3'}</div>
              {m === '6players' && (
                <div className="text-xs font-body opacity-70">con Pica-Pica</div>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Team names */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col gap-3"
      >
        <label className="text-xs font-display tracking-widest uppercase text-parchment/50">
          Equipos
        </label>
        <div className="grid grid-cols-2 gap-3">
          {([0, 1] as const).map((i) => (
            <div key={i} className="flex flex-col gap-1">
              <label className="text-xs text-parchment/40 font-body">
                Equipo {i + 1}
              </label>
              <input
                type="text"
                value={teamNames[i]}
                onChange={(e) => {
                  const updated: [string, string] = [...teamNames] as [string, string]
                  updated[i] = e.target.value
                  setTeamNames(updated)
                }}
                maxLength={20}
                className="w-full px-3 py-2 rounded-xl font-display font-semibold
                  bg-felt-800/80 text-cream border border-cream/20
                  focus:border-gold-500/60 focus:outline-none transition-colors"
                placeholder={i === 0 ? 'Nosotros' : 'Ellos'}
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Players */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-3"
        >
          <label className="text-xs font-display tracking-widest uppercase text-parchment/50">
            Jugadores (opcional)
          </label>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {Array.from({ length: totalPlayers }).map((_, i) => {
              const teamIdx = i < playersPerTeam ? 0 : 1
              const posInTeam = i < playersPerTeam ? i : i - playersPerTeam
              return (
                <div key={i} className="flex flex-col gap-1">
                  {posInTeam === 0 && (
                    <p className="text-xs text-parchment/40 font-display col-span-1">
                      {teamNames[teamIdx] || `Equipo ${teamIdx + 1}`}
                    </p>
                  )}
                  <input
                    type="text"
                    value={playerNames[i] || ''}
                    onChange={(e) => updatePlayer(i, e.target.value)}
                    maxLength={15}
                    className="w-full px-3 py-2 rounded-xl text-sm
                      bg-felt-800/60 text-cream/80 border border-cream/15
                      focus:border-gold-500/40 focus:outline-none transition-colors"
                    placeholder={placeholders[i]}
                  />
                </div>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Start button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={handleStart}
        disabled={!canStart}
        className={`mt-auto py-4 rounded-2xl font-display font-bold text-lg
          transition-all active:scale-95 shadow-xl
          ${canStart
            ? 'bg-gradient-to-b from-gold-400 to-gold-600 text-wood-900'
            : 'bg-felt-800/60 text-parchment/30 cursor-not-allowed'
          }
        `}
      >
        ¡A jugar!
      </motion.button>
    </div>
  )
}
