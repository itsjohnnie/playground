import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type { GameMode } from '@/types/game'

interface SetupScreenProps {
  onStart: (mode: GameMode, teamNames: [string, string], playerNames: string[]) => void
  onBack: () => void
}

const PLACEHOLDERS: Record<GameMode, string[]> = {
  '4players': ['Rulo', 'Nacho', 'Coco', 'Titi'],
  '6players': ['Rulo', 'Nacho', 'Coco', 'Titi', 'Luli', 'Seba'],
}

export function SetupScreen({ onStart, onBack }: SetupScreenProps) {
  const [mode, setMode] = useState<GameMode>('4players')
  const [teamNames, setTeamNames] = useState<[string, string]>(['Nosotros', 'Ellos'])
  const [playerNames, setPlayerNames] = useState<string[]>(Array(4).fill(''))

  const playersPerTeam = mode === '4players' ? 2 : 3
  const totalPlayers = playersPerTeam * 2
  const placeholders = PLACEHOLDERS[mode]

  function handleModeChange(m: GameMode) {
    setMode(m)
    setPlayerNames(Array(m === '4players' ? 4 : 6).fill(''))
  }

  function handleStart() {
    const names = playerNames.map((n, i) => n.trim() || placeholders[i])
    onStart(mode, teamNames, names)
  }

  const canStart = teamNames[0].trim().length > 0 && teamNames[1].trim().length > 0

  return (
    <div className="flex flex-col min-h-dvh px-5 py-6 gap-6 max-w-md mx-auto">
      {/* Back */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ChevronLeft className="size-4" />
          Volver
        </Button>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="font-display text-3xl font-bold text-foreground"
      >
        Nueva Partida
      </motion.h1>

      {/* Mode selector */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="flex flex-col gap-2"
      >
        <label className="text-[10px] font-display tracking-[0.2em] uppercase text-muted-foreground">
          Modalidad
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['4players', '6players'] as GameMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`py-4 rounded-xl font-display font-semibold text-sm transition-all duration-150 active:scale-[0.97] ${
                mode === m
                  ? 'bg-gradient-to-b from-[#D4AF37] to-[#b8962e] text-[#2c1a0a] shadow-lg'
                  : 'border border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-border/80'
              }`}
            >
              <div className="text-2xl font-bold">{m === '4players' ? '4' : '6'}</div>
              <div className="text-xs font-body">{m === '4players' ? '2 vs 2' : '3 vs 3'}</div>
              {m === '6players' && (
                <div className="text-[10px] opacity-70">con Pica-Pica</div>
              )}
            </button>
          ))}
        </div>
      </motion.section>

      <Separator />

      {/* Team names */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="flex flex-col gap-3"
      >
        <label className="text-[10px] font-display tracking-[0.2em] uppercase text-muted-foreground">
          Equipos
        </label>
        <div className="grid grid-cols-2 gap-3">
          {([0, 1] as const).map((i) => (
            <div key={i} className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-body">Equipo {i + 1}</label>
              <Input
                value={teamNames[i]}
                onChange={(e) => {
                  const u = [...teamNames] as [string, string]
                  u[i] = e.target.value
                  setTeamNames(u)
                }}
                maxLength={20}
                placeholder={i === 0 ? 'Nosotros' : 'Ellos'}
                className="font-display font-semibold"
              />
            </div>
          ))}
        </div>
      </motion.section>

      {/* Players */}
      <AnimatePresence mode="wait">
        <motion.section
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ delay: 0.18, duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col gap-3"
        >
          <label className="text-[10px] font-display tracking-[0.2em] uppercase text-muted-foreground">
            Jugadores <span className="normal-case tracking-normal opacity-60">(opcional)</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: totalPlayers }).map((_, i) => {
              const isTeamB = i >= playersPerTeam
              const isFirstInTeam = i === 0 || i === playersPerTeam
              return (
                <div key={i} className="flex flex-col gap-1">
                  {isFirstInTeam && (
                    <p className="text-[10px] text-muted-foreground font-display truncate">
                      {teamNames[isTeamB ? 1 : 0] || `Equipo ${isTeamB ? 2 : 1}`}
                    </p>
                  )}
                  <Input
                    value={playerNames[i] ?? ''}
                    onChange={(e) => {
                      const u = [...playerNames]
                      u[i] = e.target.value
                      setPlayerNames(u)
                    }}
                    maxLength={15}
                    placeholder={placeholders[i]}
                    className="text-sm"
                  />
                </div>
              )
            })}
          </div>
        </motion.section>
      </AnimatePresence>

      {/* Start */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="mt-auto"
      >
        <Button
          variant="gold"
          size="xl"
          className="w-full font-display font-bold text-lg"
          onClick={handleStart}
          disabled={!canStart}
        >
          ¡A jugar!
        </Button>
      </motion.div>
    </div>
  )
}
