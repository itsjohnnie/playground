import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/Sheet'

interface SignInSheetProps {
  open: boolean
  onClose: () => void
  onSignIn: (email: string) => Promise<void>
}

type Phase = 'idle' | 'sending' | 'sent' | 'error'

export function SignInSheet({ open, onClose, onSignIn }: SignInSheetProps) {
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function submit() {
    const trimmed = email.trim()
    if (!trimmed) return
    setPhase('sending')
    setErrorMsg(null)
    try {
      await onSignIn(trimmed)
      setPhase('sent')
    } catch (e) {
      setPhase('error')
      setErrorMsg((e as Error).message)
    }
  }

  function reset() {
    setEmail('')
    setPhase('idle')
    setErrorMsg(null)
  }

  return (
    <Sheet
      open={open}
      onClose={() => { onClose(); reset() }}
      title="Iniciar sesión"
    >
      {phase === 'sent' ? (
        <div className="flex flex-col gap-3 pb-2">
          <div className="flex items-center gap-2 text-ink">
            <Mail className="size-4 text-accent" />
            <span className="text-sm">Te enviamos un link a <span className="font-medium">{email}</span>.</span>
          </div>
          <p className="text-ink-muted text-sm">
            Abrí el mail desde este dispositivo para continuar. Podés cerrar este panel.
          </p>
          <Button variant="ghost" onClick={() => { onClose(); reset() }}>Listo</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-ink-muted text-sm">
            Usá tu mail para que sólo vos puedas editar tu perfil. Te mandamos un link mágico — sin contraseñas.
          </p>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            placeholder="vos@mail.com"
          />
          {phase === 'error' && errorMsg && (
            <p className="text-danger text-xs">{errorMsg}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => { onClose(); reset() }}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={submit}
              disabled={phase === 'sending' || email.trim().length === 0}
            >
              {phase === 'sending' ? 'Enviando…' : 'Mandar link'}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
