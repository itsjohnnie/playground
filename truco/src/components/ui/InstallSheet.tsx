import { useState } from 'react'
import { MonitorDown, MoreVertical, Share, SquarePlus } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/button'
import type { InstallState } from '@/hooks/useInstallState'

/**
 * How to get the app onto the home screen, for the phone in the
 * person's hand.
 *
 * Deliberately one path, not a list of every platform: being shown
 * Android's steps on an iPhone is worse than being shown nothing,
 * because you go looking for a menu that isn't there. The detection
 * lives in `useInstallState`; this only renders the branch it picks.
 */

interface Step {
  /**
   * The instruction. `{icon}` marks where the glyph belongs *in the
   * sentence* — the icon is the thing you're being told to look for,
   * so it reads as a word rather than as a bullet in its own column.
   */
  text: string
  icon?: React.ComponentType<{ className?: string }>
  /** What the OS itself calls the thing to tap, quoted verbatim. */
  target?: string
}

/** Split a step's text around its `{icon}` marker. */
function renderStep(s: Step) {
  const Icon = s.icon
  const [before, after = ''] = s.text.split('{icon}')
  return (
    <>
      {before}
      {Icon && (
        <Icon className="inline-block size-4 align-text-bottom mx-0.5 text-ink-muted" aria-hidden />
      )}
      {after}
      {s.target && <span className="text-accent font-medium">{`“${s.target}”`}</span>}
      {s.target && '.'}
    </>
  )
}

export function InstallSheet({
  open, onClose, install,
}: {
  open: boolean
  onClose: () => void
  install: InstallState
}) {
  const [outcome, setOutcome] = useState<'accepted' | 'dismissed' | null>(null)

  const steps: Step[] = install.inAppBrowser
    ? [
        { text: 'Tocá el menú de esta app y elegí ', target: 'Abrir en el navegador' },
        { text: 'Una vez abierto ahí, volvé a tocar este mismo mensaje.' },
      ]
    : install.platform === 'ios'
      ? [
          { text: 'Tocá {icon} abajo en la barra de Safari.', icon: Share },
          { text: 'Deslizá hacia abajo y elegí {icon} ', icon: SquarePlus, target: 'Agregar a inicio' },
          { text: 'Tocá ', target: 'Agregar' },
        ]
      : install.platform === 'android'
        ? [
            { text: 'Tocá {icon} arriba a la derecha.', icon: MoreVertical },
            { text: 'Elegí {icon} ', icon: SquarePlus, target: 'Instalar app' },
            { text: 'Confirmá con ', target: 'Instalar' },
          ]
        : [
            // No quoted name on the first step: the address-bar icon
            // has no label, and quoting "Instalar" here would say it
            // twice running with the step below.
            { text: 'En la barra de direcciones, tocá el ícono {icon}.', icon: MonitorDown },
            { text: 'Confirmá con ', target: 'Instalar' },
          ]

  // The sheet's own title, rather than a heading inside it: Sheet
  // already renders one in the same face and size, so a generic
  // "Instalar" above this said the same thing twice. This is the one
  // that carries information — in an in-app browser the whole message
  // is "open it somewhere else", and that belongs at the top.
  const heading = install.inAppBrowser
    ? 'Abrilo en el navegador'
    : install.platform === 'ios'
      ? 'Agregala a tu inicio'
      : 'Instalá la app'

  return (
    <Sheet open={open} onClose={onClose} title={heading}>
      <div className="flex flex-col gap-4 pb-2">
        <p className="text-sm text-ink-muted text-balance">
          {install.inAppBrowser
            ? 'Estás viendo esto dentro de otra app, y desde acá no se puede instalar.'
            : 'Queda como una app más: abre a pantalla completa y sin la barra del navegador.'}
        </p>

        {/* Chrome can just do it. Offer the real thing rather than
            describing a menu the browser is willing to open itself. */}
        {install.promptInstall && outcome !== 'accepted' && (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={async () => setOutcome(await install.promptInstall!())}
          >
            Instalar ahora
          </Button>
        )}

        {outcome === 'accepted' ? (
          <p className="text-sm text-ink-muted">Listo — buscala en tu pantalla de inicio.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {steps.map((s, i) => (
              <li
                key={i}
                className="grid grid-cols-[1rem_1fr] items-start gap-3 rounded-sm bg-surface-hi px-3 py-2.5"
              >
                {/* Both columns carry the body text's own line height, so
                    the numeral sits on the first line of the instruction
                    however many lines it runs to. */}
                <span className="tabular text-eyebrow text-ink-soft leading-5">{i + 1}</span>
                <span className="text-sm leading-5 text-ink">{renderStep(s)}</span>
              </li>
            ))}
          </ol>
        )}

        {install.iosNonSafari && (
          <p className="text-xs text-ink-soft text-balance">
            Ojo: en iPhone esto sólo funciona desde Safari. Si estás en otro
            navegador, abrí la página ahí primero.
          </p>
        )}

        <Button variant="ghost" onClick={onClose} className="w-full">Listo</Button>
      </div>
    </Sheet>
  )
}
