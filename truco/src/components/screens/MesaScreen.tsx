import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Plus, Trash2, RotateCcw, AlertTriangle, KeyRound, Sun, Moon, Smartphone } from 'lucide-react'
import { normalizeMesaCode, MESA_DEFAULT } from '@/lib/mesa'
import {
  type ThemeChoice,
  getThemeChoice,
  setThemeChoice,
  subscribeTheme,
} from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/Sheet'
import { Screen } from '@/components/ui/Screen'
import type { Player } from '@/types/game'

interface MesaScreenProps {
  active: Player[]
  retired: Player[]
  mesa: string
  onSwitchMesa: (code: string) => void
  onBack: () => void
  onAdd: (name: string) => void
  onRename: (id: string, name: string) => void
  onRetire: (id: string) => void
  onRestore: (id: string) => void
  onDelete: (id: string) => void
  onWipe: () => void
}

export function MesaScreen({ active, retired, mesa, onSwitchMesa, onBack, onAdd, onRename, onRetire, onRestore, onDelete, onWipe }: MesaScreenProps) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<Player | null>(null)
  const [editName, setEditName] = useState('')
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [mesaSheet, setMesaSheet] = useState(false)
  const [mesaInput, setMesaInput] = useState(mesa === MESA_DEFAULT ? '' : mesa)
  const [mesaError, setMesaError] = useState<string | null>(null)
  const [theme, setTheme] = useState<ThemeChoice>(() => getThemeChoice())
  useEffect(() => subscribeTheme((c) => setTheme(c)), [])

  function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return setAdding(false)
    if (active.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setNewName('')
      return
    }
    onAdd(trimmed)
    setNewName('')
    setAdding(false)
  }

  function startEdit(p: Player) {
    setEditing(p)
    setEditName(p.name)
  }

  function commitEdit() {
    if (!editing) return
    const trimmed = editName.trim()
    if (trimmed && trimmed !== editing.name) onRename(editing.id, trimmed)
    setEditing(null)
  }

  function commitMesa() {
    const trimmed = mesaInput.trim()
    if (!trimmed) {
      onSwitchMesa(MESA_DEFAULT)
      return
    }
    const norm = normalizeMesaCode(trimmed)
    if (!norm) {
      setMesaError('Usá 2–16 letras, números o guiones.')
      return
    }
    if (norm === mesa) {
      setMesaSheet(false)
      return
    }
    onSwitchMesa(norm)
  }

  return (
    <Screen className="px-5 py-5 gap-5">
      <div className="flex items-center justify-between">
        <Button variant="link" size="sm" onClick={onBack} className="-ml-1 gap-1 text-ink-muted">
          <ChevronLeft className="size-4" /> Volver
        </Button>
      </div>

      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">La mesa</p>
          <h1 className="font-display text-display text-ink leading-tight">Jugadores</h1>
        </div>
        <span className="tabular text-ink-muted text-sm pb-1">{active.length}</span>
      </header>

      <button
        onClick={() => { setMesaInput(mesa === MESA_DEFAULT ? '' : mesa); setMesaError(null); setMesaSheet(true) }}
        className="pressable flex items-center justify-between rounded-md border border-line/70 bg-surface-hi/70 px-3.5 py-2.5 text-left hover-elevate"
      >
        <span className="inline-flex items-center gap-2 text-xs text-ink-soft">
          <KeyRound className="size-3.5" /> Código de mesa
        </span>
        <span className="font-display text-ink tabular text-sm">
          {mesa === MESA_DEFAULT ? '—' : mesa}
        </span>
      </button>

      <ThemeToggle theme={theme} onChange={setThemeChoice} />

      <section className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {active.map((p, i) => (
            <motion.button
              key={p.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1], delay: Math.min(i, 5) * 0.03 }}
              onClick={() => startEdit(p)}
              className="pressable text-left flex items-center justify-between rounded-md border border-line bg-surface px-4 py-3 hover-elevate"
            >
              <span className="font-display text-ink text-h2">{p.name}</span>
              <span className="text-xs text-ink-soft">Editar</span>
            </motion.button>
          ))}
        </AnimatePresence>

        {adding ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-center gap-2"
          >
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') { setAdding(false); setNewName('') }
              }}
              maxLength={20}
              placeholder="Nombre"
            />
            <Button size="md" variant="primary" onClick={handleAdd}>Sumar</Button>
          </motion.div>
        ) : (
          <Button variant="soft" size="lg" className="justify-start gap-2" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Sumar jugador
          </Button>
        )}
      </section>

      {retired.length > 0 && (
        <section className="flex flex-col gap-2 pt-2">
          <p className="eyebrow">Retirados</p>
          <div className="flex flex-col gap-1">
            {retired.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-line/60 bg-surface/60 px-4 py-2.5">
                <span className="font-display text-ink-muted text-base">{p.name}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => onRestore(p.id)}
                    aria-label="Restaurar"
                    className="pressable rounded-sm p-2 text-ink-muted hover:text-ink"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                  <button
                    onClick={() => onDelete(p.id)}
                    aria-label="Eliminar definitivamente"
                    className="pressable rounded-sm p-2 text-danger/70 hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {active.length === 0 && retired.length === 0 && !adding && (
        <p className="text-ink-muted text-center pt-6">
          Todavía no hay nadie en la mesa. Sumá a quienes juegan los lunes.
        </p>
      )}

      <div className="mt-auto pt-6">
        <button
          onClick={() => setConfirmWipe(true)}
          className="pressable w-full inline-flex items-center justify-center gap-2 rounded-sm border border-line/60 px-4 py-2.5 text-xs text-ink-soft hover:text-danger hover:border-danger/50"
        >
          <AlertTriangle className="size-3.5" /> Reiniciar mesa y borrar todo
        </button>
      </div>

      <Sheet open={mesaSheet} onClose={() => setMesaSheet(false)} title="Código de mesa">
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-ink-muted text-sm">
            Ingresá un código para separar los datos de tu grupo. Cada código es una mesa distinta. Dejalo vacío para usar la mesa pública.
          </p>
          <Input
            autoFocus
            value={mesaInput}
            onChange={(e) => { setMesaInput(e.target.value); setMesaError(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') commitMesa() }}
            placeholder="por ej. tincholos"
            maxLength={16}
          />
          {mesaError && <p className="text-danger text-xs">{mesaError}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setMesaSheet(false)}>Cancelar</Button>
            <Button variant="primary" onClick={commitMesa}>Cambiar mesa</Button>
          </div>
          {mesa !== MESA_DEFAULT && (
            <button
              onClick={() => { onSwitchMesa(MESA_DEFAULT); setMesaSheet(false) }}
              className="pressable text-xs text-ink-muted hover:text-ink underline underline-offset-4 mt-1 self-start"
            >
              Volver a la mesa pública
            </button>
          )}
        </div>
      </Sheet>

      <Sheet open={confirmWipe} onClose={() => setConfirmWipe(false)} title="¿Borrar todo?">
        <p className="text-ink-muted text-sm pb-3">
          Esto borra jugadores, partidas e historial. No se puede deshacer.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setConfirmWipe(false)}>Cancelar</Button>
          <Button variant="danger" onClick={() => { onWipe(); setConfirmWipe(false) }}>
            Borrar todo
          </Button>
        </div>
      </Sheet>

      {/* Edit sheet */}
      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Editar jugador">
        <div className="flex flex-col gap-3 pb-2">
          <Input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit() }}
            maxLength={20}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button variant="primary" onClick={commitEdit}>Guardar</Button>
          </div>
          <button
            onClick={() => { if (editing) { onRetire(editing.id); setEditing(null) } }}
            className="pressable mt-1 rounded-sm border border-danger/40 px-4 py-3 text-danger hover:border-danger"
          >
            Retirar de la mesa
          </button>
        </div>
      </Sheet>
    </Screen>
  )
}

// ─── Theme segmented control ─────────────────────────────────

const THEME_OPTIONS: Array<{ value: ThemeChoice; label: string; icon: typeof Sun }> = [
  { value: 'auto',  label: 'Auto',   icon: Smartphone },
  { value: 'light', label: 'Claro',  icon: Sun },
  { value: 'dark',  label: 'Oscuro', icon: Moon },
]

function ThemeToggle({ theme, onChange }: { theme: ThemeChoice; onChange: (c: ThemeChoice) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-line/70 bg-surface-hi/70 px-3.5 py-2 pl-3.5 pr-1.5">
      <span className="text-xs text-ink-soft">Tema</span>
      <div role="tablist" aria-label="Tema" className="flex gap-0.5 rounded-sm bg-surface/80 p-0.5">
        {THEME_OPTIONS.map((o) => {
          const selected = theme === o.value
          const Icon = o.icon
          return (
            <button
              key={o.value}
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(o.value)}
              className={`pressable inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs transition-colors ${
                selected
                  ? 'bg-accent/15 text-ink ring-1 ring-accent/40'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Icon className="size-3.5" />
              <span>{o.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
