import { motion, AnimatePresence } from 'framer-motion'

interface PalitoGroupProps {
  count: number // 1-5
  isNew?: boolean
  color: string
}

function PalitoGroup({ count, isNew, color }: PalitoGroupProps) {
  const sticks = Array.from({ length: Math.min(count, 5) })
  return (
    <div className="relative flex items-center gap-[3px]" style={{ height: 36, minWidth: 28 }}>
      {sticks.map((_, i) => {
        const isCross = i === 4
        return (
          <motion.div
            key={i}
            initial={isNew && i === count - 1 ? { scaleY: 0, opacity: 0 } : false}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.05 * i }}
            className="rounded-full origin-bottom"
            style={{
              width: 4,
              height: isCross ? 4 : 32,
              backgroundColor: color,
              position: isCross ? 'absolute' : 'relative',
              ...(isCross
                ? {
                    width: 38,
                    height: 4,
                    left: -5,
                    top: '50%',
                    transform: 'translateY(-50%) rotate(-20deg)',
                    transformOrigin: 'center',
                  }
                : {}),
            }}
          />
        )
      })}
    </div>
  )
}

interface PalitosDisplayProps {
  score: number       // 0-15
  zone: 'malas' | 'buenas'
  animateLastPoint?: boolean
}

export function PalitosDisplay({ score, zone, animateLastPoint }: PalitosDisplayProps) {
  const color = zone === 'malas' ? '#e05a5a' : '#7de07d'
  const bgColor = zone === 'malas' ? 'rgba(139,26,26,0.25)' : 'rgba(45,106,26,0.25)'
  const borderColor = zone === 'malas' ? 'rgba(139,26,26,0.6)' : 'rgba(45,106,26,0.6)'

  // Build groups
  const full = Math.floor(score / 5)
  const remainder = score % 5

  const groups: number[] = []
  for (let i = 0; i < full; i++) groups.push(5)
  if (remainder > 0) groups.push(remainder)

  // Empty slots to always show 3 slots
  const totalSlots = 3
  const empty = totalSlots - groups.length

  const label = zone === 'malas' ? 'Malas' : 'Buenas'

  return (
    <div
      className="rounded-xl px-3 py-2 flex flex-col gap-1"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-display tracking-widest uppercase opacity-70" style={{ color }}>
          {label}
        </span>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>
          {score}/15
        </span>
      </div>
      <div className="flex items-center gap-3 min-h-[40px]">
        <AnimatePresence>
          {groups.map((count, idx) => (
            <motion.div
              key={idx}
              initial={animateLastPoint && idx === groups.length - 1 ? { scale: 0.5, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 18 }}
            >
              <PalitoGroup
                count={count}
                isNew={animateLastPoint && idx === groups.length - 1}
                color={color}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {/* Empty ghost slots */}
        {Array.from({ length: empty }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center gap-[3px] opacity-10"
            style={{ height: 36, minWidth: 28 }}
          >
            {Array.from({ length: 5 }).map((_, j) => (
              <div
                key={j}
                className="rounded-full"
                style={{ width: 4, height: 32, backgroundColor: color }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
