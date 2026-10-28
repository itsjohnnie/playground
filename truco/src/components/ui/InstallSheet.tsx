import { useState } from 'react'
import { Check, MonitorDown, MoreVertical, Share, SquarePlus } from 'lucide-react'
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
  icon?: React.ComponentType<{ className?: string }>
  /** The bit to carry out. */
  text: string
  /** What the OS itself calls the thing to tap, quoted verbatim. */
  target?: string
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
        { text: 'Tocá el menú de esta app y elegí', target: 'Abrir en el navegador' },
        { text: 'Una vez abierto ahí, volvé a tocar este mismo mensaje.' },
      ]
    : install.platform === 'ios'
      ? [
          { icon: Share, text: 'Tocá el botón de compartir, abajo en la barra de Safari.' },
          { icon: SquarePlus, text: 'Deslizá hacia abajo y elegí', target: 'Agregar a inicio' },
          { icon: Check, text: 'Tocá', target: 'Agregar' },
        ]
      : install.platform === 'android'
        ? [
            { icon: MoreVertical, text: 'Tocá el menú de tres puntos, arriba a la derecha.' },
            { icon: SquarePlus, text: 'Elegí', target: 'Instalar app' },
            { icon: Check, text: 'Confirmá con', target: 'Instalar' },
          ]
        : [
            { icon: MonitorDown, text: 'En la barra de direcciones, tocá el ícono de instalar.' },
            { icon: Check, text: 'Confirmá con', target: 'Instalar' },
          ]

  const heading = install.inAppBrowser
    ? 'Abrilo en el navegador'
    : install.platform === 'ios'
      ? 'Agregala a tu pantalla de inicio'
      : 'Instalá la app'

  return (
    <Sheet open={open} onClose={onClose} title="Instalar">
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex flex-col gap-1.5">
          <h3 className="font-display text-h2 text-ink leading-tight">{heading}</h3>
          <p className="text-sm text-ink-muted text-balance">
            {install.inAppBrowser
              ? 'Estás viendo esto dentro de otra app, y desde acá no se puede instalar.'
              : 'Queda como una app más: abre a pantalla completa y sin la barra del navegador.'}
          </p>
        </div>

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
                className="grid grid-cols-[1.5rem_1fr] items-start gap-3 rounded-sm bg-surface-hi px-3 py-2.5"
              >
                <span className="tabular text-eyebrow text-ink-soft pt-0.5 text-center">{i + 1}</span>
                <span className="text-sm text-ink flex items-start gap-1.5 flex-wrap">
                  {s.icon && <s.icon className="size-4 shrink-0 text-ink-muted mt-0.5" aria-hidden />}
                  <span>
                    {s.text}
                    {s.target && (
                      <>
                        {' '}
                        <span className="text-accent font-medium">“{s.target}”</span>.
                      </>
                    )}
                  </span>
                </span>
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
