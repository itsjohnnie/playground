import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { Check, ChevronLeft, GripVertical, Plus, Shuffle, SplitSquareVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Chip } from '@/components/ui/Chip'
import { Screen, staggerItem } from '@/components/ui/Screen'
import { cn } from '@/lib/utils'
import { useEdgeSwipeBack } from '@/hooks/useEdgeSwipeBack'
import type { Player } from '@/types/game'

interface NewMatchScreenProps {
  roster: Player[]
  defaultTeamNames: [string, string]
  onAddPlayer: (name: string) => Player
  onBack: () => void
  onStart: (
    teamA: { name: string; playerIds: string[] },
    teamB: { name: string; playerIds: string[] },
    seats?: string[],
  ) => void
}

type Step = 'pick' | 'split'
type Tone = 'a' | 'b'

export function NewMatchScreen({ roster, defaultTeamNames, onAddPlayer, onBack, onStart }: NewMatchScreenProps) {
  const [step, setStep] = useState<Step>('pick')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  // Team A/B assignment for step 2 (non-3v3 path)
  const [teamA, setTeamA] = useState<string[]>([])
  const [teamB, setTeamB] = useState<string[]>([])
  const [nameA, setNameA] = useState(defaultTeamNames[0])
  const [nameB, setNameB] = useState(defaultTeamNames[1])

  // Which column is currently the drop target while dragging
  const [draggingFrom, setDraggingFrom] = useState<Tone | null>(null)

  const colARef = useRef<HTMLDivElement>(null)
  const colBRef = useRef<HTMLDivElement>(null)

  const sortedRoster = useMemo(
    () => [...roster].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
    [roster],
  )
  const selectedPlayers = useMemo(
    () => sortedRoster.filter((p) => selected.has(p.id)),
    [sortedRoster, selected],
  )
  const isEven = selected.size > 0 && selected.size % 2 === 0
  const perTeam = selected.size / 2
  const canProceed = isEven && selected.size >= 2
  const is3v3 = selected.size === 6

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function commitNew() {
    const trimmed = newName.trim()
    if (!trimmed) return setAdding(false)
    if (roster.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setNewName('')
      return
    }
    const p = onAddPlayer(trimmed)
    setSelected((prev) => new Set(prev).add(p.id))
    setNewName('')
    setAdding(false)
  }

  function evenSplit() {
    const ids = selectedPlayers.map((p) => p.id)
    const half = Math.ceil(ids.length / 2)
    setTeamA(ids.slice(0, half))
    setTeamB(ids.slice(half))
  }

  function goSplit() {
    const ids = selectedPlayers.map((p) => p.id)
    const half = Math.ceil(ids.length / 2)
    setTeamA(ids.slice(0, half))
    setTeamB(ids.slice(half))
    setStep('split')
  }

  function moveToA(id: string) {
    setTeamB((b) => b.filter((x) => x !== id))
    setTeamA((a) => (a.includes(id) ? a : [...a, id]))
  }
  function moveToB(id: string) {
    setTeamA((a) => a.filter((x) => x !== id))
    setTeamB((b) => (b.includes(id) ? b : [...b, id]))
  }

  function autoBalance() {
    const shuffled = [...selectedPlayers].sort(() => Math.random() - 0.5)
    const half = Math.ceil(shuffled.length / 2)
    setTeamA(shuffled.slice(0, half).map((p) => p.id))
    setTeamB(shuffled.slice(half).map((p) => p.id))
  }

  // Hit-test pointer against the *other* column's bounding rect.
  function dropTargetForPointer(from: Tone, point: { x: number; y: number }): Tone | null {
    const target = from === 'a' ? colBRef.current : colARef.current
    const self = from === 'a' ? colARef.current : colBRef.current
    const rect = (el: HTMLDivElement | null) => el?.getBoundingClientRect() ?? null
    const inside = (r: DOMRect | null) =>
      !!r && point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom
    if (inside(rect(target))) return from === 'a' ? 'b' : 'a'
    if (inside(rect(self))) return from
    return null
  }

  function handleDragEnd(playerId: string, from: Tone, _e: unknown, info: PanInfo) {
    setDraggingFrom(null)
    const target = dropTargetForPointer(from, info.point)
    if (!target || target === from) return
    if (target === 'a') moveToA(playerId)
    else moveToB(playerId)
  }

  const isReady =
    teamA.length === perTeam &&
    teamB.length === perTeam &&
    teamA.length > 0 &&
    nameA.trim().length > 0 &&
    nameB.trim().length > 0

  function start() {
    if (!isReady) return
    onStart(
      { name: nameA.trim() || defaultTeamNames[0], playerIds: teamA },
      { name: nameB.trim() || defaultTeamNames[1], playerIds: teamB },
    )
  }

  // Mirror the Volver button behaviour for edge-swipe-back.
  useEdgeSwipeBack(() => {
    if (step === 'pick') onBack()
    else setStep('pick')
  })

  return (
    <Screen className="px-5 py-5 gap-5">
      <div className="flex items-center justify-between">
        <Button
          variant="link" size="sm" onClick={() => (step === 'pick' ? onBack() : setStep('pick'))}
          className="px-0 -ml-1 gap-1 text-ink-muted"
        >
          <ChevronLeft className="size-4" /> Volver
        </Button>
        <p className="eyebrow">Paso {step === 'pick' ? 1 : 2} de 2</p>
      </div>

      <header>
        <p className="eyebrow mb-2">Nueva partida</p>
        <h1 className="font-display text-display text-ink leading-tight">
          {step === 'pick'
            ? '¿Quién juega?'
            : is3v3
              ? 'A la mesa'
              : 'Armemos los equipos'}
        </h1>
      </header>

      <AnimatePresence mode="wait">
        {step === 'pick' ? (
          <motion.section
            key="pick"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col gap-4 flex-1"
          >
            {roster.length === 0 && !adding ? (
              <p className="text-ink-muted">
                La mesa está vacía. Sumá jugadores para arrancar.
              </p>
            ) : (
              <motion.div
                className="grid grid-cols-2 gap-2"
                initial="initial"
                animate="animate"
                variants={{
                  initial: {},
                  animate: { transition: { staggerChildren: 0.035, delayChildren: 0.04 } },
                }}
              >
                {sortedRoster.map((p) => (
                  <motion.div key={p.id} variants={staggerItem}>
                    <Chip
                      selected={selected.has(p.id)}
                      onClick={() => toggle(p.id)}
                      className="w-full"
                    >
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className="truncate">{p.name}</span>
                        {selected.has(p.id) && <Check className="size-3.5 shrink-0" aria-hidden />}
                      </span>
                    </Chip>
                  </motion.div>
                ))}
                {adding ? (
                  <div className="col-span-2 flex items-center gap-2">
                    <Input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitNew()
                        if (e.key === 'Escape') { setAdding(false); setNewName('') }
                      }}
                      maxLength={20}
                      placeholder="Nombre"
                      className="h-11 flex-1"
                    />
                    <Button size="md" variant="primary" onClick={commitNew}>OK</Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAdding(true)}
                    className="pressable col-span-2 inline-flex items-center justify-center gap-1 rounded-sm border border-dashed border-line bg-transparent px-3 py-2 text-sm text-ink-muted hover:text-ink hover:border-ink/40 min-h-[44px]"
                  >
                    <Plus className="size-4" /> Nuevo
                  </button>
                )}
              </motion.div>
            )}

            <div className="mt-auto pt-4">
              <p className="text-center text-sm text-ink-muted mb-3 tabular">
                {selected.size === 0 ? 'Tocá a quienes juegan'
                  : is3v3 ? '6 seleccionados · 3 vs 3 · vamos a la mesa'
                    : isEven ? `${selected.size} seleccionados · ${perTeam} vs ${perTeam}`
                      : `${selected.size} seleccionados · falta uno para parejar`}
              </p>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!canProceed}
                onClick={goSplit}
              >
                Siguiente
              </Button>
            </div>
          </motion.section>
        ) : is3v3 ? (
          <SeatPicker
            key="seats"
            players={selectedPlayers}
            nameA={nameA}
            setNameA={setNameA}
            nameB={nameB}
            setNameB={setNameB}
            defaultTeamNames={defaultTeamNames}
            onStart={onStart}
          />
        ) : (
          <motion.section
            key="split"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col gap-5 flex-1"
          >
            <p className="text-left text-sm text-ink-muted text-balance">
              Arrastrá o tocá un nombre para cambiarlo de equipo. Si querés un
              atajo, abajo los podés armar parejos o totalmente al azar.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <TeamColumn
                ref={colARef}
                title={nameA}
                onTitleChange={setNameA}
                tone="a"
                roster={roster}
                ids={teamA}
                isDropTarget={draggingFrom === 'b'}
                onTapChip={(id) => moveToB(id)}
                onDragStart={() => setDraggingFrom('a')}
                onDragEnd={(id, e, info) => handleDragEnd(id, 'a', e, info)}
                count={teamA.length}
                expected={perTeam}
              />
              <TeamColumn
                ref={colBRef}
                title={nameB}
                onTitleChange={setNameB}
                tone="b"
                roster={roster}
                ids={teamB}
                isDropTarget={draggingFrom === 'a'}
                onTapChip={(id) => moveToA(id)}
                onDragStart={() => setDraggingFrom('b')}
                onDragEnd={(id, e, info) => handleDragEnd(id, 'b', e, info)}
                count={teamB.length}
                expected={perTeam}
              />
            </div>

            <div className="mt-auto flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="soft" size="lg" onClick={evenSplit}>
                  <SplitSquareVertical className="size-4" /> Parejo
                </Button>
                <Button variant="soft" size="lg" onClick={autoBalance}>
                  <Shuffle className="size-4" /> Al azar
                </Button>
              </div>
              <Button variant="primary" size="lg" className="w-full" disabled={!isReady} onClick={start}>
                ¡A jugar!
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </Screen>
  )
}

// ─── SeatPicker (3v3 only) ─────────────────────────────────────
//
// Visual: six seats arranged around a round table, alternating
// Team A / Team B clockwise. Each player's pica pica rival is the
// seat directly across (3 seats away). Layout:
//
//                     seat 0 (A)
//          seat 5 (B)             seat 1 (B)
//                       MESA
//          seat 4 (A)             seat 2 (A)
//                     seat 3 (B)
//
// Index parity decides the team: even = A, odd = B. So Team A's
// players come from [seats[0], seats[2], seats[4]] and Team B from
// [seats[1], seats[3], seats[5]] — every shuffle keeps the seating
// authentic to how pica pica is played around a real round table.

interface SeatPickerProps {
  players: Player[]                // exactly 6, already selected in step 1
  nameA: string
  setNameA: (v: string) => void
  nameB: string
  setNameB: (v: string) => void
  defaultTeamNames: [string, string]
  onStart: (
    teamA: { name: string; playerIds: string[] },
    teamB: { name: string; playerIds: string[] },
    seats?: string[],
  ) => void
}

function SeatPicker({ players, nameA, setNameA, nameB, setNameB, defaultTeamNames, onStart }: SeatPickerProps) {
  // null in a slot = empty seat. Length 6, clockwise around the table.
  const [seats, setSeats] = useState<(string | null)[]>(() => [null, null, null, null, null, null])
  const seatRefs = useRef<Array<HTMLDivElement | null>>([null, null, null, null, null, null])
  // Team assignment is implied by seat index parity:
  //   even = Team A (accent / gold)   odd = Team B (ink / dark)
  const seatTone = (i: number): Tone => (i % 2 === 0 ? 'a' : 'b')

  const playerById = useMemo(() => {
    const map = new Map<string, Player>()
    players.forEach((p) => map.set(p.id, p))
    return map
  }, [players])

  const unseated = useMemo(
    () => players.filter((p) => !seats.includes(p.id)),
    [players, seats],
  )
  const allSeated = seats.every((s) => !!s)

  function place(playerId: string, target: number) {
    setSeats((prev) => {
      const next = [...prev]
      const oldIdx = next.findIndex((s) => s === playerId)
      if (oldIdx === target) return prev
      if (oldIdx !== -1) next[oldIdx] = null
      // Swap if the target seat already has someone and the source seat
      // was on the table (not the pool) — otherwise the displaced player
      // would just disappear off the visible state.
      if (next[target] && oldIdx !== -1) {
        next[oldIdx] = next[target]
      } else if (next[target] && oldIdx === -1) {
        // Dragged from pool onto an occupied seat — bump the current
        // occupant back to the pool.
        next[target] = null
      }
      next[target] = playerId
      return next
    })
  }

  function unseat(playerId: string) {
    setSeats((prev) => prev.map((s) => (s === playerId ? null : s)))
  }

  function shuffle() {
    const ids = [...players].sort(() => Math.random() - 0.5).map((p) => p.id)
    setSeats(ids as (string | null)[])
  }

  function seatForPoint(point: { x: number; y: number }): number | null {
    for (let i = 0; i < 6; i++) {
      const r = seatRefs.current[i]?.getBoundingClientRect()
      if (!r) continue
      if (point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom) {
        return i
      }
    }
    return null
  }

  function handleDragEnd(playerId: string, info: PanInfo) {
    const target = seatForPoint(info.point)
    if (target !== null) {
      place(playerId, target)
    } else if (seats.includes(playerId)) {
      unseat(playerId)
    }
  }

  function start() {
    if (!allSeated) return
    const ids = seats as string[]
    onStart(
      { name: nameA.trim() || defaultTeamNames[0], playerIds: [ids[0], ids[2], ids[4]] },
      { name: nameB.trim() || defaultTeamNames[1], playerIds: [ids[1], ids[3], ids[5]] },
      ids,
    )
  }

  // Render order for the hexagonal grid: which seat sits in each
  // cell (and which cells stay empty). The center cell holds the
  // mesa graphic and spans two rows.
  return (
    <motion.section
      key="seats"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      className="flex flex-col gap-4 flex-1"
    >
      <p className="text-left text-sm text-ink-muted text-balance">
        Sentate alrededor de la mesa. El que te quede enfrente es tu
        pica pica — los compañeros quedan a tus costados.
      </p>

      {/* Team name inputs, color-coded so it's clear which seats are
          which team once the names land on the table. */}
      <div className="grid grid-cols-2 gap-2">
        <TeamNameInput tone="a" value={nameA} onChange={setNameA} />
        <TeamNameInput tone="b" value={nameB} onChange={setNameB} />
      </div>

      {/* The table — a plain 3×3 CSS grid. The mesa sits in the
          centre cell; the six seats occupy the four corners plus
          the top-centre and bottom-centre cells. The two side cells
          of the middle row (col 1 / col 3) are intentionally empty,
          which gives the mesa its breathing room without any
          absolute positioning. Pica pica across-pairs still pass
          through the centre:
            seat 5 (top-left)  ↔ seat 2 (bottom-right)
            seat 0 (top-centre) ↔ seat 3 (bottom-centre)
            seat 1 (top-right) ↔ seat 4 (bottom-left)
      */}
      <div className="grid grid-cols-3 gap-2 mx-auto w-full max-w-[320px]">
        <SeatSlot
          index={5}
          tone={seatTone(5)}
          player={seats[5] ? playerById.get(seats[5]) : undefined}
          refCb={(el) => { seatRefs.current[5] = el }}
          onDragEnd={handleDragEnd}
          onTap={(pid) => unseat(pid)}
        />
        <SeatSlot
          index={0}
          tone={seatTone(0)}
          player={seats[0] ? playerById.get(seats[0]) : undefined}
          refCb={(el) => { seatRefs.current[0] = el }}
          onDragEnd={handleDragEnd}
          onTap={(pid) => unseat(pid)}
        />
        <SeatSlot
          index={1}
          tone={seatTone(1)}
          player={seats[1] ? playerById.get(seats[1]) : undefined}
          refCb={(el) => { seatRefs.current[1] = el }}
          onDragEnd={handleDragEnd}
          onTap={(pid) => unseat(pid)}
        />

        {/* Middle row: empty | mesa | empty. The empty cells give the
            mesa visual room without needing inset percentages. */}
        <div />
        <div
          aria-hidden
          className="rounded-xl border border-line/60 bg-surface-hi flex items-center justify-center min-h-[88px]"
        >
          <span className="eyebrow">Mesa</span>
        </div>
        <div />

        <SeatSlot
          index={4}
          tone={seatTone(4)}
          player={seats[4] ? playerById.get(seats[4]) : undefined}
          refCb={(el) => { seatRefs.current[4] = el }}
          onDragEnd={handleDragEnd}
          onTap={(pid) => unseat(pid)}
        />
        <SeatSlot
          index={3}
          tone={seatTone(3)}
          player={seats[3] ? playerById.get(seats[3]) : undefined}
          refCb={(el) => { seatRefs.current[3] = el }}
          onDragEnd={handleDragEnd}
          onTap={(pid) => unseat(pid)}
        />
        <SeatSlot
          index={2}
          tone={seatTone(2)}
          player={seats[2] ? playerById.get(seats[2]) : undefined}
          refCb={(el) => { seatRefs.current[2] = el }}
          onDragEnd={handleDragEnd}
          onTap={(pid) => unseat(pid)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="eyebrow">Esperando silla</p>
        <div className="flex flex-wrap gap-2 min-h-[44px]">
          {unseated.length === 0 ? (
            <p className="text-[11px] text-ink-soft self-center">Todos sentados.</p>
          ) : (
            unseated.map((p) => (
              <PoolChip
                key={p.id}
                player={p}
                onDragEnd={handleDragEnd}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <Button variant="soft" size="lg" onClick={shuffle}>
          <Shuffle className="size-4" /> Al azar
        </Button>
        <Button variant="primary" size="lg" className="w-full" disabled={!allSeated} onClick={start}>
          ¡A jugar!
        </Button>
      </div>
    </motion.section>
  )
}

function TeamNameInput({
  tone, value, onChange,
}: {
  tone: Tone
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-md border bg-surface px-2',
      tone === 'a' ? 'border-accent/40' : 'border-ink-soft/40',
    )}>
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full shrink-0',
          tone === 'a' ? 'bg-accent' : 'bg-ink',
        )}
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={18}
        className="h-9 px-1 font-display border-transparent bg-transparent focus:border-transparent focus:ring-0 min-w-0 flex-1"
      />
    </div>
  )
}

interface SeatSlotProps {
  index: number
  tone: Tone
  player: Player | undefined
  refCb: (el: HTMLDivElement | null) => void
  onDragEnd: (playerId: string, info: PanInfo) => void
  onTap: (playerId: string) => void
}

function SeatSlot({ tone, player, refCb, onDragEnd, onTap }: SeatSlotProps) {
  // Border radius is intentionally concentric with the chip inside:
  // slot rounded-lg (8px) − padding p-1 (4px) leaves the chip with a
  // 4px radius, so the chip looks evenly inset on all sides instead
  // of having different-shaped outer and inner curves.
  return (
    <div
      ref={refCb}
      className={cn(
        'relative rounded-lg border-2 border-dashed min-h-[68px] flex items-center justify-center p-1',
        tone === 'a' ? 'border-accent/30' : 'border-ink-soft/30',
      )}
    >
      {player ? (
        <SeatChip
          player={player}
          tone={tone}
          onDragEnd={(info) => onDragEnd(player.id, info)}
          onTap={() => onTap(player.id)}
        />
      ) : (
        <span className="text-[11px] text-ink-soft">Sentate acá</span>
      )}
    </div>
  )
}

function SeatChip({
  player, tone, onDragEnd, onTap,
}: {
  player: Player
  tone: Tone
  onDragEnd: (info: PanInfo) => void
  onTap: () => void
}) {
  const draggedRef = useRef(false)
  return (
    <motion.button
      type="button"
      drag
      dragSnapToOrigin
      dragMomentum={false}
      dragElastic={0.6}
      whileDrag={{ scale: 1.06, zIndex: 50, boxShadow: 'var(--shadow-2)' }}
      whileTap={{ scale: 0.97 }}
      onDragStart={() => { draggedRef.current = true }}
      onDragEnd={(_, info) => {
        onDragEnd(info)
        setTimeout(() => { draggedRef.current = false }, 0)
      }}
      onClick={() => { if (!draggedRef.current) onTap() }}
      style={{ touchAction: 'none' }}
      className={cn(
        // rounded equals slot rounded-lg (8px) minus slot's p-1 (4px)
        // so the chip looks evenly inset on every side.
        'no-select inline-flex items-center gap-1 rounded px-2 py-1.5 text-sm border w-full min-h-[44px]',
        'cursor-grab active:cursor-grabbing',
        tone === 'a'
          ? 'bg-accent text-accent-ink border-accent'
          : 'bg-ink text-bg border-ink',
      )}
      aria-label={`${player.name}. Arrastrá a otra silla o tocá para liberar.`}
    >
      <GripVertical
        className={cn(
          'size-3.5 opacity-60 shrink-0',
          tone === 'a' ? 'text-accent-ink' : 'text-bg',
        )}
        aria-hidden
      />
      <span className="truncate">{player.name}</span>
    </motion.button>
  )
}

function PoolChip({
  player, onDragEnd,
}: {
  player: Player
  onDragEnd: (playerId: string, info: PanInfo) => void
}) {
  return (
    <motion.button
      type="button"
      drag
      dragSnapToOrigin
      dragMomentum={false}
      dragElastic={0.6}
      whileDrag={{ scale: 1.08, zIndex: 50, boxShadow: 'var(--shadow-2)' }}
      whileTap={{ scale: 0.97 }}
      onDragEnd={(_, info) => onDragEnd(player.id, info)}
      style={{ touchAction: 'none' }}
      className={cn(
        // Same radius as a seated chip so the two visually rhyme.
        'no-select inline-flex items-center gap-1.5 rounded px-3 py-2 text-sm border min-h-[44px]',
        'cursor-grab active:cursor-grabbing',
        'bg-surface-hi text-ink border-line',
      )}
      aria-label={`${player.name}. Arrastrá a una silla.`}
    >
      <GripVertical className="size-3.5 opacity-50 shrink-0" aria-hidden />
      {player.name}
    </motion.button>
  )
}

// ─── TeamColumn (1v1 / 2v2 path) ───────────────────────────────

interface TeamColumnProps {
  title: string
  onTitleChange: (v: string) => void
  tone: Tone
  roster: Player[]
  ids: string[]
  isDropTarget: boolean
  count: number
  expected: number
  onTapChip: (id: string) => void
  onDragStart: () => void
  onDragEnd: (id: string, e: unknown, info: PanInfo) => void
}

const TeamColumn = function TeamColumn({
  title, onTitleChange, tone, roster, ids,
  isDropTarget, count, expected,
  onTapChip, onDragStart, onDragEnd,
  ref,
}: TeamColumnProps & { ref: React.RefObject<HTMLDivElement | null> }) {
  const balanced = count === expected
  return (
    <motion.div
      ref={ref}
      animate={{
        scale: isDropTarget ? 1.015 : 1,
      }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        'rounded-lg border p-3 flex flex-col gap-3 min-h-[220px] transition-colors',
        isDropTarget
          ? 'border-accent bg-surface-hi'
          : 'border-line bg-surface',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={18}
          className="h-9 px-2 text-base font-display border-transparent bg-transparent focus:border-line min-w-0 flex-1"
        />
        <span
          className={cn(
            'tabular text-[11px] tracking-wider font-medium',
            balanced ? 'text-ink-muted' : 'text-danger',
          )}
          aria-label={`${count} de ${expected}`}
        >
          {count}/{expected}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 min-h-[64px]">
        {ids.length === 0 ? (
          <p className="text-[11px] text-ink-soft self-center w-full text-center py-3">
            Soltá un nombre acá
          </p>
        ) : (
          ids
            .map((id) => roster.find((r) => r.id === id))
            .filter((p): p is Player => !!p)
            .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
            .map((p) => {
            return (
              <DraggableChip
                key={p.id}
                player={p}
                tone={tone}
                onTap={() => onTapChip(p.id)}
                onDragStart={() => onDragStart()}
                onDragEnd={(e, info) => onDragEnd(p.id, e, info)}
              />
            )
          })
        )}
      </div>

    </motion.div>
  )
}

function DraggableChip({
  player, tone, onTap, onDragStart, onDragEnd,
}: {
  player: Player
  tone: Tone
  onTap: () => void
  onDragStart: () => void
  onDragEnd: (e: unknown, info: PanInfo) => void
}) {
  const draggedRef = useRef(false)
  return (
    <motion.button
      type="button"
      layout
      drag
      dragSnapToOrigin
      dragMomentum={false}
      dragElastic={0.6}
      whileDrag={{ scale: 1.08, zIndex: 50, boxShadow: 'var(--shadow-2)' }}
      whileTap={{ scale: 0.97 }}
      onDragStart={() => { draggedRef.current = true; onDragStart() }}
      onDragEnd={(e, info) => {
        onDragEnd(e, info)
        // Reset shortly after so the click that may follow doesn't move the chip again.
        setTimeout(() => { draggedRef.current = false }, 0)
      }}
      onClick={() => { if (!draggedRef.current) onTap() }}
      transition={{ layout: { duration: 0.22, ease: [0.23, 1, 0.32, 1] } }}
      style={{ touchAction: 'none' }}
      className={cn(
        'no-select inline-flex items-center gap-1.5 rounded-sm px-3 py-2 text-sm border min-h-[44px]',
        'cursor-grab active:cursor-grabbing',
        tone === 'a'
          ? 'bg-accent text-accent-ink border-accent'
          : 'bg-ink text-bg border-ink',
      )}
      aria-label={`${player.name}. Arrastrá o tocá para mover al otro equipo.`}
    >
      <GripVertical className="size-3.5 opacity-50 shrink-0" aria-hidden />
      {player.name}
    </motion.button>
  )
}
