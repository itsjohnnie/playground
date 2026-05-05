import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, animate, useMotionValue } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/Sheet'
import { Screen, staggerItem } from '@/components/ui/Screen'
import { useEdgeSwipeBack } from '@/hooks/useEdgeSwipeBack'
import type { Match, Player } from '@/types/game'
import { leaderboard } from '@/utils/scoring'
import { SCORE_REASON_LABEL } from '@/types/game'

interface HistorialScreenProps {
  matches: Match[]
  roster: Player[]
  playerById: (id: string) => Player | undefined
  onBack: () => void
  onDeleteMatch: (id: string) => void
}

type Tab = 'partidas' | 'stats'

export function HistorialScreen({ matches, roster, playerById, onBack, onDeleteMatch }: HistorialScreenProps) {
  const [tab, setTab] = useState<Tab>('partidas')
  const [openMatch, setOpenMatch] = useState<Match | null>(null)
  const [swipedRowId, setSwipedRowId] = useState<string | null>(null)
  const finished = useMemo(() => matches.filter((m) => m.finishedAt !== null), [matches])
  const stats = useMemo(() => leaderboard(roster, matches), [roster, matches])
  useEdgeSwipeBack(onBack, { enabled: !openMatch })

  return (
    <Screen className="px-5 py-5 gap-5">
      <div className="flex items-center justify-between">
        <Button variant="link" size="sm" onClick={onBack} className="px-0 -ml-1 gap-1 text-ink-muted">
          <ChevronLeft className="size-4" /> Volver
        </Button>
      </div>

      <header>
        <p className="eyebrow mb-2">Historial</p>
        <h1 className="font-display text-display text-ink leading-tight">La mesa de los lunes</h1>
      </header>

      <SegmentedTabs tab={tab} onChange={setTab} />

      <AnimatePresence mode="wait">
        {tab === 'partidas' ? (
          <motion.div
            key="partidas"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={{
              initial: { opacity: 0, y: 6 },
              animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1], staggerChildren: 0.05, delayChildren: 0.04 } },
              exit:    { opacity: 0, y: -4, transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] } },
            }}
            className="flex flex-col gap-2"
          >
            {finished.length === 0 ? (
              <p className="text-ink-muted text-center pt-6">Todavía no hay partidas guardadas.</p>
            ) : (
              <AnimatePresence initial={false} mode="popLayout">
                {finished.map((m) => (
                  <motion.div
                    key={m.id}
                    layout
                    variants={staggerItem}
                    exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                    transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <MatchRow
                      match={m}
                      playerById={playerById}
                      onClick={() => setOpenMatch(m)}
                      onDelete={() => onDeleteMatch(m.id)}
                      swipeOpen={swipedRowId === m.id}
                      onSwipeOpenChange={(open) => setSwipedRowId(open ? m.id : null)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="stats"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={{
              initial: { opacity: 0, y: 6 },
              animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1], staggerChildren: 0.04, delayChildren: 0.04 } },
              exit:    { opacity: 0, y: -4, transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] } },
            }}
            className="flex flex-col gap-2"
          >
            {stats.length === 0 ? (
              <p className="text-ink-muted text-center pt-6">
                Las estadísticas aparecen cuando termina la primera partida.
              </p>
            ) : (
              <Leaderboard rows={stats} playerById={playerById} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet
        open={!!openMatch}
        onClose={() => setOpenMatch(null)}
        title={openMatch ? `${openMatch.teamA.name} vs ${openMatch.teamB.name}` : ''}
      >
        {openMatch && <MatchDetail match={openMatch} playerById={playerById} onDelete={() => { onDeleteMatch(openMatch.id); setOpenMatch(null) }} />}
      </Sheet>
    </Screen>
  )
}

// ─── Subcomponents ──────────────────────────────────────────

function SegmentedTabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="relative grid grid-cols-2 gap-0 rounded-md border border-line bg-surface p-1">
      <motion.div
        layout
        transition={{ type: 'spring', duration: 0.34, bounce: 0.18 }}
        className="absolute top-1 bottom-1 rounded-sm bg-surface-hi"
        style={{
          left: tab === 'partidas' ? '4px' : 'calc(50% + 2px)',
          right: tab === 'partidas' ? 'calc(50% + 2px)' : '4px',
        }}
      />
      {(['partidas', 'stats'] as Tab[]).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className="pressable relative z-10 py-2.5 text-sm font-medium text-ink"
          aria-pressed={tab === t}
        >
          {t === 'partidas' ? 'Partidas' : 'Estadísticas'}
        </button>
      ))}
    </div>
  )
}

// Width of the revealed delete affordance, in px.
const DELETE_REVEAL = 88

interface MatchRowProps {
  match: Match
  playerById: (id: string) => Player | undefined
  onClick: () => void
  onDelete: () => void
  swipeOpen: boolean
  onSwipeOpenChange: (open: boolean) => void
}

function MatchRow({ match, playerById, onClick, onDelete, swipeOpen, onSwipeOpenChange }: MatchRowProps) {
  const date = new Date(match.startedAt)
  const dateStr = date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  const winnerSide = match.winner
  const aWon = winnerSide === 'A'
  const bWon = winnerSide === 'B'
  const playersA = match.teamA.playerIds.map(playerById).filter(Boolean).map((p) => p!.name).join(', ')
  const playersB = match.teamB.playerIds.map(playerById).filter(Boolean).map((p) => p!.name).join(', ')

  const x = useMotionValue(0)
  const draggedRef = useRef(false)
  const SPRING = { type: 'spring' as const, stiffness: 380, damping: 36, mass: 0.6 }

  // When the parent says we're closed (because another row opened, or the
  // user dismissed), animate back to 0. We don't fight an active drag.
  useEffect(() => {
    if (draggedRef.current) return
    animate(x, swipeOpen ? -DELETE_REVEAL : 0, SPRING)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swipeOpen])

  function handleDragEnd(_: unknown, info: PanInfo) {
    setTimeout(() => { draggedRef.current = false }, 0)
    const open = info.offset.x < -DELETE_REVEAL / 2 || info.velocity.x < -300
    animate(x, open ? -DELETE_REVEAL : 0, SPRING)
    onSwipeOpenChange(open)
  }

  function handleClick() {
    if (draggedRef.current) return
    if (swipeOpen) {
      // Tap on an open row closes the reveal instead of opening detail.
      onSwipeOpenChange(false)
      return
    }
    onClick()
  }

  return (
    <div className="relative overflow-hidden rounded-md">
      {/* Delete affordance revealed underneath. The button spans the full
          row so the red continues cleanly behind the row's rounded corners
          during the slide and bounce-back, with the icon parked in the
          DELETE_REVEAL strip on the right. */}
      <button
        type="button"
        onClick={onDelete}
        aria-label="Borrar partida"
        className="pressable absolute inset-0 bg-danger text-bg"
      >
        <span
          className="absolute inset-y-0 right-0 flex items-center justify-center"
          style={{ width: DELETE_REVEAL }}
        >
          <Trash2 className="size-5" />
        </span>
      </button>

      <motion.button
        type="button"
        drag="x"
        dragConstraints={{ left: -DELETE_REVEAL, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        dragMomentum={false}
        style={{
          x,
          touchAction: 'pan-y',
          // Soft drop shadow off the row's right edge, so as the row
          // slides it casts a quiet shadow onto the red beneath. At rest
          // it lands outside the wrapper and gets clipped, so the effect
          // only appears in motion.
          boxShadow: '8px 0 18px -6px rgba(0, 0, 0, 0.45), 1px 0 0 rgba(0, 0, 0, 0.18)',
        }}
        onDragStart={() => { draggedRef.current = true }}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        className="pressable relative w-full text-left rounded-l-md border border-line bg-surface px-4 py-3 hover-elevate flex flex-col gap-1.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs eyebrow">{dateStr}</span>
          {match.abandoned && <span className="text-[11px] text-danger">Abandonada</span>}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
          <div className="min-w-0">
            <p className={`font-display truncate ${aWon ? 'text-ink' : 'text-ink-muted'}`}>{match.teamA.name}</p>
            {playersA && <p className="text-[11px] text-ink-soft truncate">{playersA}</p>}
          </div>
          <div className="font-display tabular text-ink">
            <span className={aWon ? 'text-accent' : ''}>{match.scoreA}</span>
            <span className="text-ink-soft mx-1.5">—</span>
            <span className={bWon ? 'text-accent' : ''}>{match.scoreB}</span>
          </div>
          <div className="min-w-0 text-right">
            <p className={`font-display truncate ${bWon ? 'text-ink' : 'text-ink-muted'}`}>{match.teamB.name}</p>
            {playersB && <p className="text-[11px] text-ink-soft truncate">{playersB}</p>}
          </div>
        </div>
      </motion.button>
    </div>
  )
}

function MatchDetail({ match, playerById, onDelete }: { match: Match; playerById: (id: string) => Player | undefined; onDelete: () => void }) {
  const dur = match.finishedAt
    ? Math.max(1, Math.round((match.finishedAt - match.startedAt) / 60000))
    : null
  const date = new Date(match.startedAt).toLocaleString('es-AR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
  return (
    <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pb-2">
      <div className="grid grid-cols-2 gap-3">
        <TeamSummary side="A" match={match} playerById={playerById} />
        <TeamSummary side="B" match={match} playerById={playerById} />
      </div>
      <p className="text-xs text-ink-soft tabular text-center">
        {date}{dur ? ` · ${dur} min` : ''} · {match.events.length} jugadas
      </p>
      {match.events.length > 0 && (
        <section className="flex flex-col gap-1">
          <p className="eyebrow">Jugadas</p>
          <div className="flex flex-col gap-1">
            {match.events.map((ev, i) => (
              <div
                key={i}
                className="grid grid-cols-[6.5rem_1fr_2.75rem] items-center gap-2 rounded-sm bg-surface-hi px-3 py-2"
              >
                <span className="font-display text-ink text-sm truncate">
                  {ev.team === 'A' ? match.teamA.name : match.teamB.name}
                </span>
                <span className="text-xs text-ink-muted text-center truncate">
                  {SCORE_REASON_LABEL[ev.reason]}
                </span>
                <span className="tabular text-accent text-sm font-semibold text-right">
                  {ev.points >= 0 ? '+' : ''}{ev.points}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
      <button
        onClick={onDelete}
        className="pressable rounded-sm border border-danger/40 px-4 py-2.5 text-danger hover:border-danger text-sm self-center"
      >
        Borrar partida
      </button>
    </div>
  )
}

function TeamSummary({ side, match, playerById }: { side: 'A' | 'B'; match: Match; playerById: (id: string) => Player | undefined }) {
  const team = side === 'A' ? match.teamA : match.teamB
  const score = side === 'A' ? match.scoreA : match.scoreB
  const won = match.winner === side
  const players = team.playerIds.map(playerById).filter(Boolean) as Player[]
  return (
    <div className={`rounded-md border ${won ? 'border-accent/60 bg-accent/5' : 'border-line bg-surface'} p-3`}>
      <p className="eyebrow mb-2">{team.name}</p>
      <p className={`font-display tabular ${won ? 'text-accent' : 'text-ink'} text-h1`}>{score}</p>
      {players.length > 0 && (
        <p className="text-xs text-ink-muted mt-1">{players.map((p) => p.name).join(' · ')}</p>
      )}
    </div>
  )
}

function Leaderboard({ rows, playerById }: { rows: ReturnType<typeof leaderboard>; playerById: (id: string) => Player | undefined }) {
  return (
    <div className="rounded-md border border-line bg-surface overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 border-b border-line/70 text-[11px] eyebrow">
        <span>Jugador</span>
        <span className="text-right">PJ</span>
        <span className="text-right">G</span>
        <span className="text-right">%</span>
      </div>
      {rows.map((s) => {
        const p = playerById(s.playerId)
        return (
          <motion.div key={s.playerId} variants={staggerItem} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-3 border-b border-line/40 last:border-b-0 items-center">
            <div className="min-w-0">
              <p className="font-display text-ink text-base truncate">{p?.name ?? '?'}</p>
              <div className="flex gap-0.5 mt-1">
                {s.recentForm.map((f, i) => (
                  <span
                    key={i}
                    className={`inline-block w-1.5 h-1.5 rounded-full ${f === 'W' ? 'bg-accent' : 'bg-ink-soft/40'}`}
                  />
                ))}
              </div>
            </div>
            <span className="tabular text-ink-muted text-sm">{s.matches}</span>
            <span className="tabular text-ink text-sm">{s.wins}</span>
            <span className="tabular text-accent font-semibold">{Math.round(s.winRate * 100)}%</span>
          </motion.div>
        )
      })}
    </div>
  )
}
