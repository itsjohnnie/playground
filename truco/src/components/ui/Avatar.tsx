import { cn } from '@/lib/utils'
import type { Player } from '@/types/game'

interface AvatarProps {
  player: Pick<Player, 'name' | 'photoUrl'>
  size?: number
  className?: string
}

export function Avatar({ player, size = 40, className }: AvatarProps) {
  const initial = player.name.trim().slice(0, 1).toUpperCase() || '?'
  const dim = { width: size, height: size }
  if (player.photoUrl) {
    return (
      <img
        src={player.photoUrl}
        alt=""
        loading="lazy"
        width={size}
        height={size}
        style={dim}
        className={cn(
          'rounded-full object-cover bg-surface-hi border border-line shrink-0',
          className,
        )}
      />
    )
  }
  return (
    <div
      style={dim}
      aria-hidden
      className={cn(
        'rounded-full inline-flex items-center justify-center font-display text-ink',
        'bg-surface-hi border border-line shrink-0',
        className,
      )}
    >
      {initial}
    </div>
  )
}
