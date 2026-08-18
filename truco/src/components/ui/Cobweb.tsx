import { useId, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { buildWeb } from '@/lib/cobweb'

/**
 * Ambient corner cobweb for a team that has gone cold — see
 * `dryRounds` in `@/utils/scoring`. Purely decorative: the panel is
 * one big score button, so this sits behind the content, ignores
 * pointer events, and is hidden from assistive tech.
 *
 * Geometry (and the reasoning behind it) lives in `@/lib/cobweb`.
 */
export function Cobweb({ rounds }: { rounds: number }) {
  const maskId = useId()
  const reduced = useReducedMotion()

  const { radialPaths, ringPaths, strand, opacity, sizeScale } = useMemo(
    () => buildWeb(rounds),
    [rounds],
  )

  return (
    <motion.svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute right-0 top-0 text-ink-soft"
      style={{
        width: 'clamp(76px, 26vw, 116px)',
        height: 'clamp(76px, 26vw, 116px)',
        transformOrigin: '100% 0%',
      }}
      initial={{ opacity: 0, scale: sizeScale * 0.985 }}
      animate={{
        // Growth rides on the transform rather than the box, so each
        // extra dry round eases the web outward from the corner
        // instead of snapping to a new size.
        opacity,
        scale: sizeScale,
        // A web this thin moves on room air. Mirrored so it drifts
        // rather than ticking back to a start frame.
        rotate: reduced ? 0 : [0, 0.55, 0],
      }}
      exit={{ opacity: 0, transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1] } }}
      transition={{
        opacity: { duration: 0.6, ease: [0.23, 1, 0.32, 1] },
        // Slower than the fade: the web should be caught mid-creep on
        // the round it grows, not seen to pop.
        scale: { duration: 1.1, ease: [0.23, 1, 0.32, 1] },
        rotate: reduced
          ? { duration: 0 }
          : { duration: 9, ease: [0.77, 0, 0.175, 1], repeat: Infinity },
      }}
    >
      <defs>
        {/* Densest at the corner, gone by the far edge — keeps the web
            nestled in the joint instead of pasted onto the panel. */}
        <radialGradient id={maskId} cx="100%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id={`${maskId}-m`}>
          <rect x="0" y="0" width="100" height="100" fill={`url(#${maskId})`} />
        </mask>

        {/* Silk, not ink. The turbulence warp pushes every thread off
            its mathematically perfect curve — the thing that most gives
            a generated web away — and the blurred copy underneath reads
            as the thread catching light rather than being drawn on.
            Computed once and cached; the idle drift is a transform on
            the filtered layer, so it never re-runs. */}
        <filter
          id={`${maskId}-silk`}
          x="-15%"
          y="-15%"
          width="130%"
          height="130%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="7" result="noise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="2.4"
            xChannelSelector="R"
            yChannelSelector="G"
            result="warp"
          />
          <feGaussianBlur in="warp" stdDeviation="0.6" result="halo" />
          <feMerge>
            <feMergeNode in="halo" />
            <feMergeNode in="warp" />
          </feMerge>
        </filter>
      </defs>

      <g
        mask={`url(#${maskId}-m)`}
        filter={`url(#${maskId}-silk)`}
        stroke="currentColor"
        strokeLinecap="round"
      >
        {radialPaths.map((d, i) => (
          <path
            key={`r${i}`}
            d={d}
            strokeWidth={0.8}
            strokeOpacity={0.75}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {ringPaths.map((d, i) => (
          <path
            key={`c${i}`}
            d={d}
            strokeWidth={0.65}
            // Outer threads catch less light than the ones packed into
            // the corner.
            strokeOpacity={0.9 - i * 0.13}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {strand && (
          <path
            d={strand}
            strokeWidth={0.55}
            strokeOpacity={0.5}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </g>
    </motion.svg>
  )
}
