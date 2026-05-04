import { motion } from 'framer-motion'
import { Trophy, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { SavedMatch } from '@/types/game'

interface HomeScreenProps {
  history: SavedMatch[]
  hasActiveGame: boolean
  onNewGame: () => void
  onContinue: () => void
  onClearHistory: () => void
}

function formatRelativeDate(ts: number) {
  const now = Date.now()
  const diff = now - ts
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 2) return 'Hace un momento'
  if (mins < 60) return `Hace ${mins} min`
  if (hours < 24) return `Hace ${hours}h`
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  return new Date(ts).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function formatDuration(start: number, end: number) {
  const mins = Math.round((end - start) / 60000)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export function HomeScreen({ history, hasActiveGame, onNewGame, onContinue, onClearHistory }: HomeScreenProps) {
  // Stagger delay for history items (Emil: 30–80ms between items)
  const itemDelay = (i: number) => 0.3 + i * 0.05

  return (
    <div className="flex flex-col min-h-dvh px-5 pb-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        className="flex flex-col items-center pt-16 pb-10 gap-3"
      >
        {/* Card suits decorative */}
        <div className="flex gap-3 text-gold/40 text-xl select-none mb-1">
          <span>♠</span><span>♣</span><span>♥</span><span>♦</span>
        </div>
        <h1 className="font-display text-6xl font-black text-foreground tracking-tight leading-none">
          Truco
        </h1>
        <p className="font-display text-muted-foreground text-xs tracking-[0.3em] uppercase">
          Argentino
        </p>
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
        className="flex flex-col gap-3"
      >
        {hasActiveGame && (
          <Button
            variant="gold"
            size="xl"
            className="w-full font-display font-bold text-lg"
            onClick={onContinue}
          >
            Continuar partida
          </Button>
        )}
        <Button
          variant={hasActiveGame ? 'outline' : 'gold'}
          size="xl"
          className={`w-full font-display font-bold text-lg ${!hasActiveGame ? '' : 'border-border'}`}
          onClick={onNewGame}
        >
          Nueva partida
        </Button>
      </motion.div>

      {/* History */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="mt-10 flex flex-col gap-4"
        >
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-[10px] font-display tracking-[0.2em] uppercase text-muted-foreground">
              Historial
            </span>
            <Separator className="flex-1" />
          </div>

          <div className="flex flex-col gap-2">
            {history.map((match, i) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: itemDelay(i), duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="flex items-center justify-between rounded-xl px-4 py-3 gap-3"
                style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="size-3 text-[#D4AF37] shrink-0" />
                    <span className="text-sm font-display font-semibold text-[#D4AF37] truncate">
                      {match.winnerName}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground truncate">
                    {match.teamNames[0]} {match.finalScores[0]} — {match.finalScores[1]} {match.teamNames[1]}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3" />
                    <span className="text-[10px]">{formatRelativeDate(match.startedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="size-3" />
                    <span className="text-[10px]">
                      {match.mode === '4players' ? '4' : '6'} · {formatDuration(match.startedAt, match.finishedAt)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <button
            onClick={onClearHistory}
            className="text-[11px] text-muted-foreground underline underline-offset-2 text-center pt-1 transition-opacity hover:opacity-80"
          >
            Borrar historial
          </button>
        </motion.div>
      )}

      {/* PWA install hint (mobile only) */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-auto pt-8 text-center text-[11px] text-muted-foreground/50 font-body"
      >
        Instalá la app: compartí a tu grupo y cada uno lleva su propio marcador
      </motion.p>
    </div>
  )
}
