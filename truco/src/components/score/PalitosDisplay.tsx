import { motion } from 'framer-motion'

// Individual tally group SVG — 4 verticals + optional diagonal cross
function TallyGroup({
  count,
  color,
  isNew = false,
}: {
  count: number
  color: string
  isNew?: boolean
}) {
  const vCount = Math.min(count, 4)
  const hasCross = count === 5
  // viewBox: 44×38, lines at x=5,14,23,32 (9px apart), y from 2 to 36
  const xs = [5, 14, 23, 32]

  return (
    <svg
      width="38"
      height="34"
      viewBox="0 0 38 34"
      fill="none"
      aria-hidden
    >
      {xs.slice(0, vCount).map((x, i) => {
        const animate = isNew && i === vCount - 1 && !hasCross
        return (
          <motion.line
            key={i}
            x1={x} y1={2} x2={x} y2={32}
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            initial={animate ? { pathLength: 0, opacity: 0 } : false}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1], delay: animate ? 0 : 0 }}
          />
        )
      })}
      {hasCross && (
        <motion.line
          x1={2} y1={30} x2={36} y2={4}
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          initial={isNew ? { pathLength: 0, opacity: 0 } : false}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
        />
      )}
    </svg>
  )
}

// Ghost group — shown for empty slots so layout doesn't shift
function GhostGroup({ color }: { color: string }) {
  const xs = [5, 14, 23, 32]
  return (
    <svg width="38" height="34" viewBox="0 0 38 34" fill="none" aria-hidden>
      {xs.map((x, i) => (
        <line key={i} x1={x} y1={2} x2={x} y2={32}
          stroke={color} strokeWidth={2.5} strokeLinecap="round" opacity={0.07} />
      ))}
    </svg>
  )
}

interface PalitosDisplayProps {
  score: number    // 0–15
  zone: 'malas' | 'buenas'
  lastScored?: boolean
}

export function PalitosDisplay({ score, zone, lastScored }: PalitosDisplayProps) {
  const color = zone === 'malas' ? '#dc7070' : '#70c080'
  const label = zone === 'malas' ? 'Malas' : 'Buenas'

  // Build groups: full 5s + remainder
  const groups: number[] = []
  const full = Math.floor(score / 5)
  const rem = score % 5
  for (let i = 0; i < full; i++) groups.push(5)
  if (rem > 0) groups.push(rem)

  const totalSlots = 3 // always show 3 slots for layout stability

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span
          className="text-[9px] font-display tracking-[0.18em] uppercase font-semibold"
          style={{ color, opacity: score === 0 ? 0.3 : 0.75 }}
        >
          {label}
        </span>
        <span
          className="text-[10px] tabular-nums font-semibold"
          style={{ color, opacity: score === 0 ? 0.25 : 0.6 }}
        >
          {score}/15
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        {groups.map((count, idx) => (
          <TallyGroup
            key={idx}
            count={count}
            color={color}
            isNew={lastScored && idx === groups.length - 1}
          />
        ))}
        {/* Ghost slots to keep layout stable */}
        {Array.from({ length: totalSlots - groups.length }).map((_, i) => (
          <GhostGroup key={`ghost-${i}`} color={color} />
        ))}
      </div>
    </div>
  )
}
