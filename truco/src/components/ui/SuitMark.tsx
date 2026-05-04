// Decorative suit row — only used on Home & Win.
export function SuitMark({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-3 text-xl no-select ${className}`}
      aria-hidden="true"
    >
      <span className="text-ink/55">♠</span>
      <span className="text-ink/55">♣</span>
      <span className="text-suit-red/90">♥</span>
      <span className="text-suit-red/90">♦</span>
    </div>
  )
}
