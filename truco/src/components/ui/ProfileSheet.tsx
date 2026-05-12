import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Camera, ImagePlus, LogIn, Trash2, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/Sheet'
import { Avatar } from '@/components/ui/Avatar'
import type { Player } from '@/types/game'
import type { PlayerProfilePatch } from '@/hooks/useStore'

interface ProfileSheetProps {
  open: boolean
  player: Player | null
  user: User | null
  onClose: () => void
  onUpdate: (id: string, patch: PlayerProfilePatch) => Promise<void>
  onSetPhoto: (id: string, file: File) => Promise<string>
  onRemovePhoto: (id: string) => Promise<void>
  onClaim: (id: string) => Promise<void>
  onUnclaim: (id: string) => Promise<void>
  onRetire: (id: string) => void
  onSignInPress: () => void
}

export function ProfileSheet({
  open, player, user,
  onClose, onUpdate, onSetPhoto, onRemovePhoto,
  onClaim, onUnclaim, onRetire, onSignInPress,
}: ProfileSheetProps) {
  const [name, setName]           = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [phone, setPhone]         = useState('')
  const [venmo, setVenmo]         = useState('')
  const [zelle, setZelle]         = useState('')
  const [busy, setBusy]           = useState<null | 'save' | 'photo' | 'claim'>(null)
  const [errorMsg, setErrorMsg]   = useState<string | null>(null)
  // Retire is a destructive, no-undo action — first tap arms the
  // confirmation, second tap commits. State lives in the sheet so it
  // resets when a different player is opened (effect below).
  const [confirmRetire, setConfirmRetire] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Reset form whenever a different player is opened.
  useEffect(() => {
    if (!player) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(player.name)
    setFirstName(player.firstName ?? '')
    setLastName(player.lastName  ?? '')
    setPhone(player.phone        ?? '')
    setVenmo(player.venmo        ?? '')
    setZelle(player.zelle        ?? '')
    setErrorMsg(null)
    setBusy(null)
    setConfirmRetire(false)
  }, [player])

  // Auto-disarm the retire confirmation after a few seconds so the
  // armed state doesn't linger if the user wanders away mid-decision.
  useEffect(() => {
    if (!confirmRetire) return
    const t = setTimeout(() => setConfirmRetire(false), 4000)
    return () => clearTimeout(t)
  }, [confirmRetire])

  if (!player) return null

  const isClaimed   = !!player.authUserId
  const isMine      = !!user && player.authUserId === user.id
  const claimable   = !!user && !isClaimed
  // RLS allows anyone to mutate unclaimed rows, and only the claimant
  // to mutate claimed ones — mirror that here.
  const canEdit     = isMine || !isClaimed

  async function save() {
    if (!player || !canEdit) return
    setBusy('save')
    setErrorMsg(null)
    try {
      await onUpdate(player.id, {
        name,
        firstName: firstName,
        lastName:  lastName,
        phone,
        venmo,
        zelle,
      })
      onClose()
    } catch (e) {
      setErrorMsg((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function pickPhoto(file: File) {
    if (!player || !canEdit) return
    setBusy('photo')
    setErrorMsg(null)
    try {
      await onSetPhoto(player.id, file)
    } catch (e) {
      setErrorMsg((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function removePhoto() {
    if (!player || !canEdit) return
    setBusy('photo')
    setErrorMsg(null)
    try {
      await onRemovePhoto(player.id)
    } catch (e) {
      setErrorMsg((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function claim() {
    if (!player) return
    setBusy('claim')
    setErrorMsg(null)
    try {
      await onClaim(player.id)
    } catch (e) {
      setErrorMsg((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function unclaim() {
    if (!player) return
    setBusy('claim')
    setErrorMsg(null)
    try {
      await onUnclaim(player.id)
    } catch (e) {
      setErrorMsg((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Perfil">
      <div className="flex flex-col gap-4 pb-2">
        {/* Avatar + claim status */}
        <div className="flex items-center gap-3">
          <Avatar player={player} size={64} />
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="font-display text-h2 text-ink truncate">{player.name}</div>
            <div className="text-[11px] text-ink-soft">
              {isMine ? 'Tu perfil'
                : isClaimed ? 'Reclamado por otra persona'
                  : 'Sin reclamar'}
            </div>
          </div>
          {canEdit && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) pickPhoto(f)
                  e.target.value = ''
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy !== null}
                aria-label={player.photoUrl ? 'Cambiar foto' : 'Agregar foto'}
                className="pressable rounded-md border border-line bg-surface-hi p-2 text-ink-muted hover:text-ink"
              >
                {player.photoUrl
                  ? <Camera   className="size-4" />
                  : <ImagePlus className="size-4" />}
              </button>
              {player.photoUrl && (
                <button
                  onClick={removePhoto}
                  disabled={busy !== null}
                  aria-label="Quitar foto"
                  className="pressable rounded-md border border-line bg-surface-hi p-2 text-ink-soft hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Sign-in nudge: anon can still edit unclaimed rows, but only
            authed users can reclaim. Show the CTA on claimed-by-other rows
            (where there's truly nothing to do) or unclaimed rows (so the
            user can sign in and reclaim it as theirs). */}
        {!user && (
          <button
            onClick={onSignInPress}
            className="pressable inline-flex items-center justify-center gap-2 rounded-md border border-line bg-surface-hi px-3 py-2.5 text-sm text-ink hover-elevate"
          >
            <LogIn className="size-4" /> Iniciar sesión para reclamar
          </button>
        )}

        {/* Claim CTA */}
        {claimable && (
          <button
            onClick={claim}
            disabled={busy !== null}
            className="pressable inline-flex items-center justify-center gap-2 rounded-md border border-accent/60 bg-accent/15 px-3 py-2.5 text-sm font-medium text-accent hover:bg-accent/25"
          >
            <UserCheck className="size-4" /> Soy yo — reclamar este perfil
          </button>
        )}

        {/* Form */}
        <div className="flex flex-col gap-3">
          <Field label="Apodo (en pantalla)">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} disabled={!canEdit} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre">
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={40} disabled={!canEdit} />
            </Field>
            <Field label="Apellido">
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={40} disabled={!canEdit} />
            </Field>
          </div>
          <Field label="Teléfono">
            <Input
              type="tel" inputMode="tel" autoComplete="tel"
              value={phone} onChange={(e) => setPhone(e.target.value)}
              maxLength={32} disabled={!canEdit}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Venmo">
              <Input
                value={venmo} onChange={(e) => setVenmo(e.target.value)}
                placeholder="@usuario" maxLength={40} disabled={!canEdit}
              />
            </Field>
            <Field label="Zelle">
              <Input
                value={zelle} onChange={(e) => setZelle(e.target.value)}
                placeholder="mail o teléfono" maxLength={64} disabled={!canEdit}
              />
            </Field>
          </div>
        </div>

        {errorMsg && <p className="text-danger text-xs">{errorMsg}</p>}

        {/* Action cluster: Cancelar / Guardar share a row and
            Retirar sits directly beneath them, so the three primary
            actions read as one block. The internal `gap-3` matches
            the form's row gap above, and the row's horizontal
            `gap-3` matches it on the other axis too. */}
        <div className="flex flex-col gap-3">
          {canEdit && (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button variant="primary" onClick={save} disabled={busy !== null}>
                {busy === 'save' ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          )}
          <button
            onClick={() => {
              if (!player) return
              if (confirmRetire) { onRetire(player.id); onClose() }
              else setConfirmRetire(true)
            }}
            aria-pressed={confirmRetire}
            className={
              'pressable rounded-md border px-4 py-3 transition-colors ' +
              (confirmRetire
                ? 'border-danger bg-danger text-bg font-medium'
                : 'border-danger/40 text-danger hover:border-danger')
            }
          >
            {confirmRetire ? 'Tocá de nuevo para confirmar' : 'Retirar de la mesa'}
          </button>
        </div>

        {/* Liberar este perfil — tertiary escape hatch, separated
            from the action cluster above by the outer `gap-4` so it
            reads as a distinct, quieter affordance. */}
        {isMine && (
          <div className="flex justify-center">
            <button
              onClick={unclaim}
              disabled={busy !== null}
              className="pressable text-xs text-ink-muted underline underline-offset-4"
            >
              Liberar este perfil
            </button>
          </div>
        )}
      </div>
    </Sheet>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
      {children}
    </label>
  )
}
