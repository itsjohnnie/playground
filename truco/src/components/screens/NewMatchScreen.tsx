import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { Check, ChevronLeft, GripVertical, Plus, Shuffle, SplitSquareVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Chip } from '@/components/ui/Chip'
import { Screen } from '@/components/ui/Screen'
import { cn } from '@/lib/utils'
import type { Player } from '@/types/game'

interface NewMatchScreenProps {
  roster: Player[]
  defaultTeamNames: [string, string]
  onAddPlayer: (name: string) => Player
  onBack: () => void
  onStart: (
    teamA: { name: string; playerIds: string[] },
    teamB: { name: string; playerIds: string[] },
  ) => void
}

type Step = 'pick' | 'split'
type Tone = 'a' | 'b'

export function NewMatchScreen({ roster, defaultTeamNames, onAddPlayer, onBack, onStart }: NewMatchScreenProps) {
  const [step, setStep] = useState<Step>('pick')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  // Team A/B assignment for step 2
  const [teamA, setTeamA] = useState<string[]>([])
  const [teamB, setTeamB] = useState<string[]>([])
  const [nameA, setNameA] = useState(defaultTeamNames[0])
  const [nameB, setNameB] = useState(defaultTeamNames[1])

  // Which column is currently the drop target while dragging
  const [draggingFrom, setDraggingFrom] = useState<Tone | null>(null)

  const colARef = useRef<HTMLDivElement>(null)
  const colBRef = useRef<HTMLDivElement>(null)

  const selectedPlayers = useMemo(
    () => roster.filter((p) => selected.has(p.id)),
    [roster, selected],
  )
  const isEven = selected.size > 0 && selected.size % 2 === 0
  const perTeam = selected.size / 2
  const canProceed = isEven && selected.size >= 2

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
          {step === 'pick' ? '¿Quién juega?' : 'Armemos los equipos'}
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
              <div className="flex flex-col gap-2">
                {roster.map((p) => (
                  <Chip key={p.id} selected={selected.has(p.id)} onClick={() => toggle(p.id)}>
                    <span className="inline-flex items-center gap-1">
                      {p.name}
                      {selected.has(p.id) && <Check className="size-3.5" aria-hidden />}
                    </span>
                  </Chip>
                ))}
                {adding ? (
                  <div className="flex items-center gap-2">
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
                      className="h-11 w-32"
                    />
                    <Button size="md" variant="primary" onClick={commitNew}>OK</Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAdding(true)}
                    className="pressable inline-flex items-center gap-1 rounded-sm border border-dashed border-line bg-transparent px-3 py-2 text-sm text-ink-muted hover:text-ink hover:border-ink/40 min-h-[44px]"
                  >
                    <Plus className="size-4" /> Nuevo
                  </button>
                )}
              </div>
            )}

            <div className="mt-auto pt-4">
              <p className="text-center text-sm text-ink-muted mb-3 tabular">
                {selected.size === 0 ? 'Tocá a quienes juegan'
                  : isEven ? `${selected.size} seleccionados · ${perTeam} vs ${perTeam}`
                    : `${selected.size} seleccionados · falta uno para parejar`}
              </p>
              <Button
                variant="primary"
                size="xl"
                className="w-full"
                disabled={!canProceed}
                onClick={goSplit}
              >
                Siguiente
              </Button>
            </div>
          </motion.section>
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
              Arrastrá un nombre al otro lado, o tocalo para mandarlo enfrente.
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

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={evenSplit}
                className="pressable inline-flex items-center justify-center gap-2 rounded-sm border border-line bg-surface-hi px-3 py-2 text-sm text-ink hover-elevate"
              >
                <SplitSquareVertical className="size-4" /> Parejo
              </button>
              <button
                onClick={autoBalance}
                className="pressable inline-flex items-center justify-center gap-2 rounded-sm border border-line bg-surface-hi px-3 py-2 text-sm text-ink hover-elevate"
              >
                <Shuffle className="size-4" /> Al azar
              </button>
            </div>

            <div className="mt-auto">
              <Button variant="primary" size="xl" className="w-full" disabled={!isReady} onClick={start}>
                ¡A jugar!
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </Screen>
  )
}

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
          ids.map((id) => {
            const p = roster.find((r) => r.id === id)
            if (!p) return null
            return (
              <DraggableChip
                key={id}
                player={p}
                tone={tone}
                onTap={() => onTapChip(id)}
                onDragStart={() => onDragStart()}
                onDragEnd={(e, info) => onDragEnd(id, e, info)}
              />
            )
          })
        )}
      </div>

      <p className="text-[11px] text-ink-soft mt-auto">
        Arrastrá o tocá para cambiar de equipo.
      </p>
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
