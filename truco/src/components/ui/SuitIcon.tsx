// SVG icons for Spanish card suits
interface SuitIconProps {
  suit: 'espadas' | 'bastos' | 'copas' | 'oros'
  className?: string
}

export function SuitIcon({ suit, className = 'w-5 h-5' }: SuitIconProps) {
  const icons = {
    espadas: (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2 L14.5 8 L20 8 L15.5 11.5 L17.5 17.5 L12 14 L6.5 17.5 L8.5 11.5 L4 8 L9.5 8 Z" />
        <rect x="10.5" y="17" width="3" height="5" rx="1" />
      </svg>
    ),
    bastos: (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 3 C12 3 9 5 9 8 C7 7 5 8 5 10 C5 12 7 13 9 12.5 C8 15 9 18 12 19 C15 18 16 15 15 12.5 C17 13 19 12 19 10 C19 8 17 7 15 8 C15 5 12 3 12 3 Z" />
        <rect x="10.5" y="18.5" width="3" height="4" rx="1" />
      </svg>
    ),
    copas: (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M6 4 L18 4 L18 6 C18 10 16 13 12 14 C8 13 6 10 6 6 Z" />
        <path d="M10 14 L10 18 L8 20 L16 20 L14 18 L14 14 Z" />
      </svg>
    ),
    oros: (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="5" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
      </svg>
    ),
  }

  return <>{icons[suit]}</>
}

export function SuitsRow({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-gold-500"><SuitIcon suit="espadas" className="w-4 h-4" /></span>
      <span className="text-gold-500"><SuitIcon suit="bastos" className="w-4 h-4" /></span>
      <span className="text-gold-400"><SuitIcon suit="copas" className="w-4 h-4" /></span>
      <span className="text-gold-400"><SuitIcon suit="oros" className="w-4 h-4" /></span>
    </div>
  )
}
