import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Plus, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Chip } from '@/components/ui/Chip'
import { Screen } from '@/components/ui/Screen'
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

  function goSplit() {
    // Pre-assign half / half in selection order
    const ids = selectedPlayers.map((p) => p.id)
    setTeamA(ids.slice(0, ids.length / 2))
    setTeamB(ids.slice(ids.length / 2))
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
    setTeamA(shuffled.slice(0, perTeam).map((p) => p.id))
    setTeamB(shuffled.slice(perTeam).map((p) => p.id))
  }

  const isReady = teamA.length === perTeam && teamB.length === perTeam && teamA.length > 0 && nameA.trim() && nameB.trim()

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
          className="-ml-1 gap-1 text-ink-muted"
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
              <div className="flex flex-wrap gap-2">
                {roster.map((p) => (
                  <Chip key={p.id} selected={selected.has(p.id)} onClick={() => toggle(p.id)}>
                    {p.name}
                    {selected.has(p.id) ? ' ✓' : ''}
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
            <div className="grid grid-cols-2 gap-3">
              <TeamColumn
                title={nameA}
                onTitleChange={setNameA}
                tone="a"
                roster={roster}
                ids={teamA}
                onPickFromOther={(id) => moveToA(id)}
              />
              <TeamColumn
                title={nameB}
                onTitleChange={setNameB}
                tone="b"
                roster={roster}
                ids={teamB}
                onPickFromOther={(id) => moveToB(id)}
              />
            </div>

            <button
              onClick={autoBalance}
              className="pressable inline-flex items-center justify-center gap-2 self-center rounded-sm border border-line bg-surface-hi px-4 py-2 text-sm text-ink hover-elevate"
            >
              <Shuffle className="size-4" /> Auto-balancear
            </button>

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

function TeamColumn({
  title, onTitleChange, tone, roster, ids, onPickFromOther,
}: {
  title: string
  onTitleChange: (v: string) => void
  tone: 'a' | 'b'
  roster: Player[]
  ids: string[]
  onPickFromOther: (id: string) => void
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3 flex flex-col gap-3 min-h-[200px]">
      <Input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        maxLength={18}
        className="h-9 px-2 text-base font-display border-transparent bg-transparent focus:border-line"
      />
      <div className="flex flex-wrap gap-1.5">
        {ids.map((id) => {
          const p = roster.find((r) => r.id === id)
          if (!p) return null
          return (
            <Chip key={id} selected tone={tone} onClick={() => onPickFromOther(id)}>
              {p.name}
            </Chip>
          )
        })}
      </div>
      <p className="text-[11px] text-ink-soft mt-auto">
        Tocá un nombre para cambiarlo de equipo.
      </p>
    </div>
  )
}
