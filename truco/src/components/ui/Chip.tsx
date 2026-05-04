import * as React from 'react'
import { cn } from '@/lib/utils'

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  tone?: 'neutral' | 'a' | 'b'
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, selected, tone = 'neutral', children, ...props }, ref) => {
    const base =
      'pressable inline-flex items-center gap-2 rounded-sm px-3 py-2 text-sm border min-h-[44px]'
    const variantClass = selected
      ? tone === 'a'
        ? 'bg-accent text-accent-ink border-accent'
        : tone === 'b'
          ? 'bg-ink text-bg border-ink'
          : 'bg-accent text-accent-ink border-accent'
      : 'bg-surface-hi text-ink border-line hover-elevate'
    return (
      <button
        ref={ref}
        className={cn(base, variantClass, className)}
        aria-pressed={selected}
        {...props}
      >
        {children}
      </button>
    )
  },
)
Chip.displayName = 'Chip'
