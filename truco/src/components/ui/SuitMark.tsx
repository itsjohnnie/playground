import { Oro, Copa, Espada, Basto } from './Suits'

// Decorative Spanish-suit row — used on Home & Win.
// Order is the canonical Argentine recital: oro, copa, espada, basto.
export function SuitMark({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-3 text-xl no-select ${className}`}
      aria-hidden="true"
    >
      <Oro    className="text-accent" />
      <Copa   className="text-suit-red/90" />
      <Espada className="text-suit-blue/90" />
      <Basto  className="text-suit-green/90" />
    </div>
  )
}
