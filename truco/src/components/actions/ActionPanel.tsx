import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { calcFaltaEnvido, TRUCO_POINTS, ENVIDO_POINTS } from '@/utils/scoring'
import type { GameState, RoundMode } from '@/types/game'

interface ActionPanelProps {
  game: GameState
  onScore: (teamIndex: 0 | 1, points: number, reason: string) => void
}

// A row: label on left, [refuse button] [won button] on right
function BetRow({
  label,
  refusePoints,
  wonPoints,
  onRefuse,
  onWon,
  isVariable = false,
}: {
  label: string
  refusePoints: number
  wonPoints: number
  onRefuse: () => void
  onWon: () => void
  isVariable?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-sm font-display text-foreground/70 font-medium">{label}</span>
      <Button
        variant="refuse"
        size="sm"
        onClick={onRefuse}
        className="w-16 flex-col h-auto py-1.5 gap-0"
      >
        <span className="text-[9px] leading-tight opacity-70">no quiso</span>
        <span className="text-sm font-bold">+{refusePoints}</span>
      </Button>
      <Button
        variant="gold"
        size="sm"
        onClick={onWon}
        className="w-16 flex-col h-auto py-1.5 gap-0"
      >
        <span className="text-[9px] leading-tight opacity-70">{isVariable ? 'variable' : 'ganó'}</span>
        <span className="text-sm font-bold">+{wonPoints}</span>
      </Button>
    </div>
  )
}

type PendingAction = { points: number; reason: string }

export function ActionPanel({ game, onScore }: ActionPanelProps) {
  const [pending, setPending] = useState<PendingAction | null>(null)
  const roundMode: RoundMode = game.currentRoundMode
  const teamNames: [string, string] = [game.teams[0].name, game.teams[1].name]

  function ask(points: number, reason: string) {
    setPending({ points, reason })
  }

  function confirm(idx: 0 | 1) {
    if (!pending) return
    onScore(idx, pending.points, pending.reason)
    setPending(null)
  }

  const falta = (winnerIdx: 0 | 1) => {
    const loserIdx: 0 | 1 = winnerIdx === 0 ? 1 : 0
    return calcFaltaEnvido(game.scores[loserIdx], game.scores[winnerIdx], roundMode)
  }

  const slideVariants = {
    enter: { opacity: 0, x: -8 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 8 },
  }

  return (
    <>
      {/* Team selector dialog */}
      <Dialog open={!!pending} onOpenChange={(o) => { if (!o) setPending(null) }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>
              ¿Quién sumó{' '}
              <span className="text-[#D4AF37]">+{pending?.points}</span>?
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            {teamNames.map((name, i) => (
              <Button
                key={i}
                variant="gold"
                size="lg"
                className="w-full justify-center text-base font-display font-bold"
                onClick={() => confirm(i as 0 | 1)}
              >
                {name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <div className="border-t border-border">
        {/* Pica-pica mode indicator for 6p */}
        {game.mode === '6players' && (
          <div className="flex justify-center py-2">
            <span className={`text-[10px] font-display tracking-widest uppercase font-bold px-2.5 py-1 rounded-full ${
              roundMode === 'picapica'
                ? 'text-[#D4AF37] bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)]'
                : 'text-foreground/35 bg-white/[0.03] border border-white/8'
            }`}>
              {roundMode === 'picapica' ? '⚔ Pica-Pica' : '◈ Redondo'}
            </span>
          </div>
        )}

        <Tabs defaultValue="truco">
          <TabsList className="w-full bg-transparent px-4 pt-1">
            <TabsTrigger value="truco">Truco</TabsTrigger>
            <TabsTrigger value="envido">Envido</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="truco" className="px-4 py-4">
              <motion.div
                variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-col gap-3"
              >
                <BetRow
                  label="Truco"
                  refusePoints={TRUCO_POINTS.truco.refused}
                  wonPoints={TRUCO_POINTS.truco.won}
                  onRefuse={() => ask(TRUCO_POINTS.truco.refused, 'Truco (rechazado)')}
                  onWon={() => ask(TRUCO_POINTS.truco.won, 'Truco')}
                />
                <BetRow
                  label="Retruco"
                  refusePoints={TRUCO_POINTS.retruco.refused}
                  wonPoints={TRUCO_POINTS.retruco.won}
                  onRefuse={() => ask(TRUCO_POINTS.retruco.refused, 'Retruco (rechazado)')}
                  onWon={() => ask(TRUCO_POINTS.retruco.won, 'Retruco')}
                />
                <BetRow
                  label="Vale Cuatro"
                  refusePoints={TRUCO_POINTS.vale4.refused}
                  wonPoints={TRUCO_POINTS.vale4.won}
                  onRefuse={() => ask(TRUCO_POINTS.vale4.refused, 'Vale 4 (rechazado)')}
                  onWon={() => ask(TRUCO_POINTS.vale4.won, 'Vale cuatro')}
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="envido" className="px-4 py-4">
              <motion.div
                variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-col gap-3"
              >
                <BetRow
                  label="Envido"
                  refusePoints={ENVIDO_POINTS.envido.refused}
                  wonPoints={ENVIDO_POINTS.envido.won}
                  onRefuse={() => ask(ENVIDO_POINTS.envido.refused, 'Envido (rechazado)')}
                  onWon={() => ask(ENVIDO_POINTS.envido.won, 'Envido')}
                />
                <BetRow
                  label="Real Envido"
                  refusePoints={ENVIDO_POINTS.realenvido.refused}
                  wonPoints={ENVIDO_POINTS.realenvido.won}
                  onRefuse={() => ask(ENVIDO_POINTS.realenvido.refused, 'Real Envido (rechazado)')}
                  onWon={() => ask(ENVIDO_POINTS.realenvido.won, 'Real Envido')}
                />

                {/* Falta Envido — direct per-team buttons, no dialog needed */}
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-sm font-display text-foreground/70 font-medium">
                      Falta Envido{roundMode === 'picapica' ? ' (= 6)' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {teamNames.map((name, i) => {
                      const pts = falta(i as 0 | 1)
                      return (
                        <Button
                          key={i}
                          variant="gold"
                          size="sm"
                          onClick={() => onScore(i as 0 | 1, pts, 'Falta Envido')}
                          className="flex-col h-auto py-2 gap-0"
                        >
                          <span className="text-[10px] opacity-70 truncate max-w-full">{name}</span>
                          <span className="text-base font-bold">+{pts}</span>
                        </Button>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Falta rechazada → mitad de estos puntos
                  </p>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="manual" className="px-4 py-4">
              <motion.div
                variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-col gap-3"
              >
                <p className="text-xs text-muted-foreground text-center font-body">
                  Sumá puntos directamente
                </p>
                {([1, 2, 3, 4] as const).map((pts) => (
                  <div key={pts} className="flex items-center gap-2">
                    <span className="flex-1 text-sm font-display text-foreground/70">+{pts} {pts === 1 ? 'punto' : 'puntos'}</span>
                    {teamNames.map((name, i) => (
                      <Button
                        key={i}
                        variant={pts <= 2 ? 'gold' : 'outline'}
                        size="sm"
                        onClick={() => onScore(i as 0 | 1, pts, 'Manual')}
                        className="w-24 truncate font-display"
                      >
                        {name}
                      </Button>
                    ))}
                  </div>
                ))}
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </div>
    </>
  )
}
