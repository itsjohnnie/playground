import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreVertical, RotateCcw, X, ClockIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { TeamPanel } from '@/components/score/TeamPanel'
import { ActionPanel } from '@/components/actions/ActionPanel'
import type { GameState } from '@/types/game'

interface GameScreenProps {
  game: GameState
  onScore: (teamIndex: 0 | 1, points: number, reason: string) => void
  onUndo: () => void
  onAbandon: () => void
}

export function GameScreen({ game, onScore, onUndo, onAbandon }: GameScreenProps) {
  const [lastScoredTeam, setLastScoredTeam] = useState<0 | 1 | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleScore(idx: 0 | 1, pts: number, reason: string) {
    onScore(idx, pts, reason)
    setLastScoredTeam(idx)
    if (clearTimer.current) clearTimeout(clearTimer.current)
    clearTimer.current = setTimeout(() => setLastScoredTeam(null), 2000)
  }

  const isLeading0 = game.scores[0] > game.scores[1]
  const isLeading1 = game.scores[1] > game.scores[0]
  const lastEntry = game.history.at(-1)

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-[#D4AF37] text-base">Truco</span>
          <span className="text-muted-foreground text-xs">
            {game.mode === '4players' ? '2 vs 2' : '3 vs 3'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHistoryOpen(true)}
            className="text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded-lg transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ClockIcon className="size-3.5 inline mr-1 -mt-0.5" />
            Jugadas
          </button>
          <button
            onClick={() => setMenuOpen(true)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg"
          >
            <MoreVertical className="size-4" />
          </button>
        </div>
      </header>

      {/* Score area — two columns, no heavy surfaces */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0" style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
          <TeamPanel
            team={game.teams[0]}
            players={game.players.filter((p) => p.teamId === game.teams[0].id)}
            score={game.scores[0]}
            isLeading={isLeading0}
            lastScored={lastScoredTeam === 0}
          />
        </div>
        <div className="flex-1 min-w-0">
          <TeamPanel
            team={game.teams[1]}
            players={game.players.filter((p) => p.teamId === game.teams[1].id)}
            score={game.scores[1]}
            isLeading={isLeading1}
            lastScored={lastScoredTeam === 1}
          />
        </div>
      </div>

      {/* Last action */}
      <AnimatePresence>
        {lastEntry && (
          <motion.div
            key={lastEntry.timestamp}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="px-4 py-2 flex items-center justify-center"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="text-[11px] text-muted-foreground font-body">
              <span className="text-[#D4AF37] font-semibold">
                {game.teams.find((t) => t.id === lastEntry.teamId)?.name}
              </span>
              {' '}— {lastEntry.reason}{' '}
              <span className="text-[#70c080]">+{lastEntry.points}</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action panel */}
      <div className="shrink-0">
        <ActionPanel game={game} onScore={handleScore} />
      </div>

      {/* ── Menu dialog ── */}
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Opciones</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              disabled={game.history.length === 0}
              onClick={() => { onUndo(); setMenuOpen(false) }}
            >
              <RotateCcw className="size-4" />
              Deshacer último punto
            </Button>
            <Separator />
            <Button
              variant="destructive"
              className="w-full justify-start gap-2"
              onClick={() => { setMenuOpen(false); setConfirmAbandon(true) }}
            >
              <X className="size-4" />
              Abandonar partida
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm abandon dialog ── */}
      <Dialog open={confirmAbandon} onOpenChange={setConfirmAbandon}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Abandonar la partida?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Los puntos actuales no se guardarán en el historial.
          </p>
          <div className="flex gap-3 mt-5">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmAbandon(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => { onAbandon(); setConfirmAbandon(false) }}>
              Abandonar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── History bottom sheet ── */}
      <AnimatePresence>
        {historyOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setHistoryOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 z-50 max-w-md mx-auto rounded-t-2xl overflow-hidden"
              style={{ background: 'hsl(155,50%,12%)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <h3 className="font-display font-bold text-foreground">Jugadas</h3>
                <button onClick={() => setHistoryOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              </div>
              <Separator />
              <div className="overflow-y-auto max-h-[55vh] px-4 py-3 flex flex-col gap-1">
                {game.history.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-6">Sin jugadas aún</p>
                ) : (
                  [...game.history].reverse().map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <span className="text-sm text-foreground/80 font-display">
                        {game.teams.find((t) => t.id === entry.teamId)?.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{entry.reason}</span>
                      <Badge variant="gold">+{entry.points}</Badge>
                    </div>
                  ))
                )}
              </div>
              <div className="h-safe-bottom" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
