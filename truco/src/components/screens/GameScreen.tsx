import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreVertical, Undo2, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/Sheet'
import { Screen } from '@/components/ui/Screen'
import {
  type Match,
  type Player,
  type ScoreReason,
  TRUCO_POINTS,
  ENVIDO_POINTS,
  BUENAS_THRESHOLD,
  SCORE_REASON_LABEL,
} from '@/types/game'
import { calcFaltaEnvido, detectRoundMode, splitScore, isInBuenas } from '@/utils/scoring'

interface GameScreenProps {
  match: Match
  playerById: (id: string) => Player | undefined
  onScore: (team: 'A' | 'B', points: number, reason: ScoreReason) => void
  onUndo: () => void
  onAbandon: () => void
}

export function GameScreen({ match, playerById, onScore, onUndo, onAbandon }: GameScreenProps) {
  const [scoringFor, setScoringFor] = useState<null | 'A' | 'B'>(null)
  const [menu, setMenu] = useState(false)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const roundMode = detectRoundMode(match.scoreA, match.scoreB)
  const lastEvent = match.events[match.events.length - 1]

  function teamPlayers(side: 'A' | 'B') {
    const ids = side === 'A' ? match.teamA.playerIds : match.teamB.playerIds
    return ids.map(playerById).filter(Boolean) as Player[]
  }

  function score(team: 'A' | 'B', pts: number, reason: ScoreReason) {
    onScore(team, pts, reason)
    setScoringFor(null)
  }

  return (
    <Screen className="">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-line/70 px-4 py-3">
        <span className="font-display text-h2 text-ink">Truco</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setHistoryOpen(true)}
            aria-label="Jugadas"
            className="pressable rounded-sm px-2.5 py-1.5 text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-xs"
          >
            <Clock className="size-4" />
            <span className="tabular">{match.events.length}</span>
          </button>
          <button
            onClick={onUndo}
            disabled={match.events.length === 0}
            aria-label="Deshacer"
            className="pressable rounded-sm p-2 text-ink-muted hover:text-ink disabled:opacity-30"
          >
            <Undo2 className="size-4" />
          </button>
          <button
            onClick={() => setMenu(true)}
            aria-label="Opciones"
            className="pressable rounded-sm p-2 text-ink-muted hover:text-ink"
          >
            <MoreVertical className="size-4" />
          </button>
        </div>
      </header>

      {/* Two team panels */}
      <div className="grid grid-cols-2 flex-1 min-h-0">
        <TeamPanel
          name={match.teamA.name}
          players={teamPlayers('A')}
          score={match.scoreA}
          highlight={match.scoreA > match.scoreB}
          onScore={() => setScoringFor('A')}
          right={false}
        />
        <TeamPanel
          name={match.teamB.name}
          players={teamPlayers('B')}
          score={match.scoreB}
          highlight={match.scoreB > match.scoreA}
          onScore={() => setScoringFor('B')}
          right={true}
        />
      </div>

      {/* Bottom bar — round mode + last action */}
      <div className="border-t border-line/70 px-4 py-3 flex items-center justify-between text-xs">
        <span className="eyebrow">{roundMode === 'picapica' ? 'Pica-pica' : 'Redondo'}</span>
        <AnimatePresence mode="wait">
          {lastEvent && (
            <motion.span
              key={lastEvent.at}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="text-ink-muted tabular"
            >
              <span className="font-display text-ink">
                {lastEvent.team === 'A' ? match.teamA.name : match.teamB.name}
              </span>
              {' · '}
              {SCORE_REASON_LABEL[lastEvent.reason]}{' '}
              <span className="text-accent">+{lastEvent.points}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Score sheet */}
      <Sheet
        open={!!scoringFor}
        onClose={() => setScoringFor(null)}
        title={scoringFor ? `Sumó ${scoringFor === 'A' ? match.teamA.name : match.teamB.name}` : ''}
      >
        {scoringFor && (
          <ScoreSheet
            roundMode={roundMode}
            myScore={scoringFor === 'A' ? match.scoreA : match.scoreB}
            theirScore={scoringFor === 'A' ? match.scoreB : match.scoreA}
            onPick={(pts, reason) => score(scoringFor, pts, reason)}
          />
        )}
      </Sheet>

      {/* Options sheet */}
      <Sheet open={menu} onClose={() => setMenu(false)} title="Opciones">
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="lg"
            disabled={match.events.length === 0}
            onClick={() => { onUndo(); setMenu(false) }}
            className="justify-start gap-3"
          >
            <Undo2 className="size-4" /> Deshacer último punto
          </Button>
          <button
            onClick={() => { setMenu(false); setConfirmAbandon(true) }}
            className="pressable rounded-sm border border-danger/40 px-4 py-3 text-left text-danger hover:border-danger inline-flex items-center gap-3"
          >
            <X className="size-4" /> Abandonar partida
          </button>
        </div>
      </Sheet>

      {/* Confirm abandon */}
      <Sheet open={confirmAbandon} onClose={() => setConfirmAbandon(false)} title="¿Abandonar?">
        <p className="text-ink-muted text-sm pb-3">
          Quedará registrada como abandonada y no contará en las estadísticas.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setConfirmAbandon(false)}>Cancelar</Button>
          <Button variant="danger" onClick={() => { onAbandon(); setConfirmAbandon(false) }}>
            Abandonar
          </Button>
        </div>
      </Sheet>

      {/* Event history */}
      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Jugadas">
        {match.events.length === 0 ? (
          <p className="text-ink-muted text-center py-6">Sin jugadas todavía.</p>
        ) : (
          <div className="flex flex-col gap-1 max-h-[55vh] overflow-y-auto pb-2">
            {[...match.events].reverse().map((ev, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-sm bg-surface-hi px-3 py-2"
              >
                <span className="font-display text-ink text-base">
                  {ev.team === 'A' ? match.teamA.name : match.teamB.name}
                </span>
                <span className="text-xs text-ink-muted">{SCORE_REASON_LABEL[ev.reason]}</span>
                <span className="tabular text-accent font-semibold">+{ev.points}</span>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </Screen>
  )
}

// ─── Team panel ──────────────────────────────────────────────

function TeamPanel({
  name, players, score, highlight, onScore, right,
}: {
  name: string
  players: Player[]
  score: number
  highlight: boolean
  onScore: () => void
  right: boolean
}) {
  const inBuenas = isInBuenas(score)
  const { malas, buenas } = splitScore(score)
  return (
    <button
      onClick={onScore}
      className={`pressable group relative flex flex-col gap-3 px-4 py-5 text-left ${right ? '' : 'border-r border-line/70'} hover-elevate`}
      aria-label={`Sumar puntos a ${name}`}
    >
      <div className="flex flex-col gap-1">
        <span className="eyebrow">{name}</span>
        {players.length > 0 && (
          <span className="text-xs text-ink-soft truncate">
            {players.map((p) => p.name).join(' · ')}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={score}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className={`font-display tabular leading-none ${highlight ? 'text-ink' : 'text-ink/85'}`}
            style={{ fontSize: 'clamp(56px, 18vw, 88px)' }}
          >
            {score}
          </motion.span>
        </AnimatePresence>
        <span className="text-ink-soft text-sm">/30</span>
      </div>

      <div className="flex flex-col gap-1.5 mt-auto">
        <Palitos count={malas} accent={!inBuenas && score > 0} />
        {score >= BUENAS_THRESHOLD && <Palitos count={buenas} accent={true} />}
      </div>

      <div className="absolute right-3 bottom-3 text-[11px] text-ink-soft opacity-0 group-hover:opacity-100 transition-opacity">
        + sumar
      </div>
    </button>
  )
}

// ─── Palitos: 5 marks per group, 4 verticals + 1 diagonal ────

function Palitos({ count, accent }: { count: number; accent: boolean }) {
  const groups: number[] = []
  let n = count
  while (n > 0) { groups.push(Math.min(5, n)); n -= 5 }
  if (groups.length === 0) groups.push(0)
  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((g, gi) => (
        <PalitoGroup key={gi} count={g} accent={accent} />
      ))}
    </div>
  )
}

function PalitoGroup({ count, accent }: { count: number; accent: boolean }) {
  const stroke = accent ? 'hsl(var(--accent))' : 'hsl(var(--ink) / 0.55)'
  return (
    <svg width="34" height="22" viewBox="0 0 34 22" fill="none">
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={4 + i * 6} y1={3} x2={4 + i * 6} y2={19}
          stroke={count > i ? stroke : 'hsl(var(--line))'}
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
      {count >= 5 && (
        <line
          x1={2} y1={18} x2={26} y2={4}
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

// ─── Score sheet (bottom sheet content) ──────────────────────

function ScoreSheet({
  roundMode, myScore, theirScore, onPick,
}: {
  roundMode: 'redondo' | 'picapica'
  myScore: number
  theirScore: number
  onPick: (pts: number, reason: ScoreReason) => void
}) {
  const falta = calcFaltaEnvido(theirScore, myScore, roundMode)
  return (
    <div className="flex flex-col gap-5 pb-2 max-h-[70vh] overflow-y-auto">
      <Section title="Truco">
        <Row label="Truco"
          left={{ pts: TRUCO_POINTS.truco.refused, sub: 'no quiso', reason: 'truco_rechazado' }}
          right={{ pts: TRUCO_POINTS.truco.won, sub: 'ganó', reason: 'truco' }}
          onPick={onPick}
        />
        <Row label="Retruco"
          left={{ pts: TRUCO_POINTS.retruco.refused, sub: 'no quiso', reason: 'retruco_rechazado' }}
          right={{ pts: TRUCO_POINTS.retruco.won, sub: 'ganó', reason: 'retruco' }}
          onPick={onPick}
        />
        <Row label="Vale Cuatro"
          left={{ pts: TRUCO_POINTS.vale4.refused, sub: 'no quiso', reason: 'vale4_rechazado' }}
          right={{ pts: TRUCO_POINTS.vale4.won, sub: 'ganó', reason: 'vale4' }}
          onPick={onPick}
        />
      </Section>

      <Section title="Envido">
        <Row label="Envido"
          left={{ pts: ENVIDO_POINTS.envido.refused, sub: 'no quiso', reason: 'envido_rechazado' }}
          right={{ pts: ENVIDO_POINTS.envido.won, sub: 'ganó', reason: 'envido' }}
          onPick={onPick}
        />
        <Row label="Real Envido"
          left={{ pts: ENVIDO_POINTS.realenvido.refused, sub: 'no quiso', reason: 'real_envido_rechazado' }}
          right={{ pts: ENVIDO_POINTS.realenvido.won, sub: 'ganó', reason: 'real_envido' }}
          onPick={onPick}
        />
        <Row label={`Falta Envido${roundMode === 'picapica' ? ' (=6)' : ''}`}
          left={{ pts: Math.max(1, Math.floor(falta / 2)), sub: 'no quiso', reason: 'falta_envido_rechazado' }}
          right={{ pts: falta, sub: 'ganó', reason: 'falta_envido' }}
          onPick={onPick}
        />
      </Section>

      <Section title="Manual">
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((pts) => (
            <button
              key={pts}
              onClick={() => onPick(pts, 'manual')}
              className="pressable rounded-sm border border-line bg-surface-hi py-3 text-ink hover-elevate"
            >
              <span className="tabular text-lg font-semibold">+{pts}</span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <p className="eyebrow">{title}</p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  )
}

function Row({
  label, left, right, onPick,
}: {
  label: string
  left: { pts: number; sub: string; reason: ScoreReason }
  right: { pts: number; sub: string; reason: ScoreReason }
  onPick: (pts: number, reason: ScoreReason) => void
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
      <span className="font-display text-ink text-base">{label}</span>
      <button
        onClick={() => onPick(left.pts, left.reason)}
        className="pressable rounded-sm border border-line bg-surface-hi px-3 py-2 text-ink hover-elevate min-w-[68px]"
      >
        <div className="text-[10px] text-ink-soft leading-none mb-0.5">{left.sub}</div>
        <div className="tabular text-base font-semibold">+{left.pts}</div>
      </button>
      <button
        onClick={() => onPick(right.pts, right.reason)}
        className="pressable rounded-sm bg-accent text-accent-ink px-3 py-2 hover:bg-accent-hi min-w-[68px]"
      >
        <div className="text-[10px] opacity-75 leading-none mb-0.5">{right.sub}</div>
        <div className="tabular text-base font-semibold">+{right.pts}</div>
      </button>
    </div>
  )
}
