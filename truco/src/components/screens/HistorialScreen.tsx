import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, animate, useMotionValue } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/Sheet'
import { Screen, staggerItem } from '@/components/ui/Screen'
import { useEdgeSwipeBack } from '@/hooks/useEdgeSwipeBack'
import type { Match, Player } from '@/types/game'
import { leaderboard, duels, type Duel } from '@/utils/scoring'
import { SCORE_REASON_LABEL } from '@/types/game'

interface HistorialScreenProps {
  matches: Match[]
  roster: Player[]
  playerById: (id: string) => Player | undefined
  onBack: () => void
  onDeleteMatch: (id: string) => void
}

type Tab = 'partidas' | 'stats' | 'duelos'

export function HistorialScreen({ matches, roster, playerById, onBack, onDeleteMatch }: HistorialScreenProps) {
  const [tab, setTab] = useState<Tab>('partidas')
  const [openMatch, setOpenMatch] = useState<Match | null>(null)
  const [swipedRowId, setSwipedRowId] = useState<string | null>(null)
  const finished = useMemo(() => matches.filter((m) => m.finishedAt !== null), [matches])
  const stats = useMemo(() => leaderboard(roster, matches), [roster, matches])
  const allDuels = useMemo(() => duels(matches), [matches])
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
        {tab === 'partidas' && (
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
        )}

        {tab === 'stats' && (
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

        {tab === 'duelos' && (
          <motion.div
            key="duelos"
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
            {allDuels.length === 0 ? (
              <p className="text-ink-muted text-center pt-6 text-balance">
                Los duelos aparecen cuando termina una partida 3 vs 3 — cada
                jugador queda frente a uno del otro equipo (su pica pica).
              </p>
            ) : (
              <DuelsList duels={allDuels} playerById={playerById} />
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
  // Three equal-width tabs. The active-pill is positioned per index
  // via calc() over the percentage column edges, with a 2 px gutter
  // from the segment's inner padding.
  const tabs: Tab[] = ['partidas', 'stats', 'duelos']
  const label = (t: Tab) =>
    t === 'partidas' ? 'Partidas' : t === 'stats' ? 'Estadísticas' : 'Duelos'
  const idx = tabs.indexOf(tab)
  // Each tab occupies 1/3 of the container width. Inner padding p-1
  // (4 px) means the pill should leave a 2 px gutter at each side
  // of its slot.
  const left = `calc(${(idx * 100) / 3}% + 2px)`
  const right = `calc(${((tabs.length - 1 - idx) * 100) / 3}% + 2px)`
  return (
    <div className="relative grid grid-cols-3 gap-0 rounded-md border border-line bg-surface p-1">
      <motion.div
        layout
        transition={{ type: 'spring', duration: 0.34, bounce: 0.18 }}
        className="absolute top-1 bottom-1 rounded-sm bg-surface-hi"
        style={{ left, right }}
      />
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className="pressable relative z-10 py-2.5 text-sm font-medium text-ink"
          aria-pressed={tab === t}
        >
          {label(t)}
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

// Scroll-fade overlay strip applied to MatchDetail. The Sheet's bg
// is `--surface` (not `--bg`), so the fade has to wash from the
// surface colour to transparent — using `--bg` would draw a darker
// strip on top of the sheet instead of disappearing into it.
const DETAIL_FADE_HEIGHT = 40
const DETAIL_FADE_BG_TOP =
  'linear-gradient(to bottom, ' +
  'hsl(var(--surface)) 0%, ' +
  'hsl(var(--surface) / 0.86) 30%, ' +
  'hsl(var(--surface) / 0.46) 65%, ' +
  'transparent 100%)'
const DETAIL_FADE_BG_BOTTOM =
  'linear-gradient(to top, ' +
  'hsl(var(--surface)) 0%, ' +
  'hsl(var(--surface) / 0.86) 30%, ' +
  'hsl(var(--surface) / 0.46) 65%, ' +
  'transparent 100%)'
const DETAIL_FADE_MASK_TOP =
  'linear-gradient(to bottom, ' +
  '#000 0%, ' +
  'rgba(0,0,0,0.6) 60%, ' +
  'transparent 100%)'
const DETAIL_FADE_MASK_BOTTOM =
  'linear-gradient(to top, ' +
  '#000 0%, ' +
  'rgba(0,0,0,0.6) 60%, ' +
  'transparent 100%)'

function MatchDetail({ match, playerById, onDelete }: { match: Match; playerById: (id: string) => Player | undefined; onDelete: () => void }) {
  const dur = match.finishedAt
    ? Math.max(1, Math.round((match.finishedAt - match.startedAt) / 60000))
    : null
  const date = new Date(match.startedAt).toLocaleString('es-AR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  // Soft-fade the top + bottom of the scroll area instead of letting
  // the jugadas list hard-crop against the sheet's edges. Mirrors the
  // pattern from `Screen` — observe the container, all direct
  // children, and subsequent child-list mutations so the gradients
  // appear on initial mount when there's overflow, not just on the
  // first scroll.
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showTop, setShowTop] = useState(false)
  const [showBottom, setShowBottom] = useState(false)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function update() {
      if (!el) return
      setShowTop(el.scrollTop > 4)
      setShowBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 4)
    }
    const ro = new ResizeObserver(update)
    function reobserve() {
      ro.disconnect()
      ro.observe(el!)
      for (const child of Array.from(el!.children)) ro.observe(child)
    }
    reobserve()
    update()
    const raf = requestAnimationFrame(update)
    el.addEventListener('scroll', update, { passive: true })
    const mo = new MutationObserver(() => { reobserve(); update() })
    mo.observe(el, { childList: true })
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', update)
      ro.disconnect()
      mo.disconnect()
    }
  }, [match.id])

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pb-2"
      >
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

      {/* Top fade — visible once the jugadas list has been scrolled
          down past the dead zone, so the top of the scroll area
          softens into the sheet instead of cutting off. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 transition-opacity duration-200 ease-out"
        style={{
          height: DETAIL_FADE_HEIGHT,
          opacity: showTop ? 1 : 0,
          background: DETAIL_FADE_BG_TOP,
          maskImage: DETAIL_FADE_MASK_TOP,
          WebkitMaskImage: DETAIL_FADE_MASK_TOP,
        }}
      />
      {/* Bottom fade — visible whenever there's more content below
          the visible area. This is the main one in practice: the
          jugadas list is often long enough to need it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 transition-opacity duration-200 ease-out"
        style={{
          height: DETAIL_FADE_HEIGHT,
          opacity: showBottom ? 1 : 0,
          background: DETAIL_FADE_BG_BOTTOM,
          maskImage: DETAIL_FADE_MASK_BOTTOM,
          WebkitMaskImage: DETAIL_FADE_MASK_BOTTOM,
        }}
      />
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
  // Fixed widths for the three numeric columns so the header letters and
  // the row values share the same column track. With auto widths each
  // row sized to its own digits ("PJ" wider than "2", "%" narrower than
  // "50%") and the headers drifted relative to the numbers below.
  const gridTemplate = { gridTemplateColumns: '1fr 2.5rem 2.5rem 3rem' }
  return (
    <div className="rounded-md border border-line bg-surface overflow-hidden">
      <div className="grid gap-3 px-4 py-2 border-b border-line/70 text-[11px] eyebrow" style={gridTemplate}>
        <span>Jugador</span>
        <span className="text-right">PJ</span>
        <span className="text-right">G</span>
        <span className="text-right">%</span>
      </div>
      {rows.map((s) => {
        const p = playerById(s.playerId)
        return (
          <motion.div
            key={s.playerId}
            variants={staggerItem}
            style={gridTemplate}
            className="grid gap-3 px-4 py-3 border-b border-line/40 last:border-b-0 items-center"
          >
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
            <span className="tabular text-ink-muted text-sm text-right">{s.matches}</span>
            <span className="tabular text-ink text-sm text-right">{s.wins}</span>
            <span className="tabular text-accent font-semibold text-right">{Math.round(s.winRate * 100)}%</span>
          </motion.div>
        )
      })}
    </div>
  )
}

function DuelsList({ duels: rows, playerById }: { duels: Duel[]; playerById: (id: string) => Player | undefined }) {
  // Each row is one head-to-head pair: name · score · name, then a
  // small "N duelos" subline. The middle column holds a tabular score
  // with a fixed-width centre dash so longer name pairs don't shift
  // the digits around when the grid widths vary.
  return (
    <div className="rounded-md border border-line bg-surface overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 px-4 py-2 border-b border-line/70 text-[11px] eyebrow">
        <span className="text-right">Jugador</span>
        <span className="text-center">Duelos</span>
        <span>Jugador</span>
      </div>
      {rows.map((d) => {
        const pa = playerById(d.playerIdA)
        const pb = playerById(d.playerIdB)
        const aLeads = d.winsA > d.winsB
        const bLeads = d.winsB > d.winsA
        return (
          <motion.div
            key={d.playerIdA + ':' + d.playerIdB}
            variants={staggerItem}
            className="grid grid-cols-[1fr_auto_1fr] gap-3 px-4 py-3 border-b border-line/40 last:border-b-0 items-center"
          >
            <div className="min-w-0 text-right">
              <p className={`font-display text-base truncate ${aLeads ? 'text-ink' : 'text-ink-muted'}`}>
                {pa?.name ?? '?'}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="font-display tabular text-ink text-base">
                <span className={aLeads ? 'text-accent' : ''}>{d.winsA}</span>
                <span className="text-ink-soft mx-1.5">—</span>
                <span className={bLeads ? 'text-accent' : ''}>{d.winsB}</span>
              </div>
              <p className="text-[11px] text-ink-soft tabular">
                {d.matches === 1 ? '1 duelo' : `${d.matches} duelos`}
              </p>
            </div>
            <div className="min-w-0 text-left">
              <p className={`font-display text-base truncate ${bLeads ? 'text-ink' : 'text-ink-muted'}`}>
                {pb?.name ?? '?'}
              </p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
