import { useId, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { Player } from '@/types/game'
import type { SeasonProgress } from '@/utils/scoring'

/**
 * League points accumulated over the season, one line per player.
 *
 * Hand-rolled rather than pulled from a chart library: this is a
 * polyline and a baseline, and a library would add far more weight
 * than the drawing is worth — then fight the app's type and colour to
 * look like everything else.
 *
 * Six-plus lines at phone width is spaghetti, so only one is ever
 * solid. The rest sit underneath as faint context: you read your own
 * climb against the shape of the pack, not against five other labels.
 * Selection is driven by the table below, which already lists every
 * player and doubles as the legend.
 */

const VIEW_W = 320
const VIEW_H = 132
// Room for the end-cap dot and the peak label without clipping.
const PAD = { top: 12, right: 10, bottom: 14, left: 10 }

export function SeasonChart({
  progress,
  selectedId,
  playerById,
}: {
  progress: SeasonProgress
  selectedId: string | null
  playerById: (id: string) => Player | undefined
}) {
  const clipId = useId()
  const reduced = useReducedMotion()
  const { timeline, series, max } = progress

  const geometry = useMemo(() => {
    const innerW = VIEW_W - PAD.left - PAD.right
    const innerH = VIEW_H - PAD.top - PAD.bottom
    // A single match would put every point on the same x; guard the
    // divisor so the line degenerates to a dot rather than NaN.
    const stepX = timeline.length > 1 ? innerW / (timeline.length - 1) : 0
    const scaleY = max > 0 ? innerH / max : 0
    const at = (i: number, v: number): [number, number] => [
      PAD.left + i * stepX,
      PAD.top + innerH - v * scaleY,
    ]
    return {
      innerH,
      paths: series.map((s) => ({
        playerId: s.playerId,
        total: s.values[s.values.length - 1] ?? 0,
        end: at(s.values.length - 1, s.values[s.values.length - 1] ?? 0),
        d: s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${at(i, v).map((n) => n.toFixed(1)).join(' ')}`).join(' '),
      })),
    }
  }, [timeline.length, series, max])

  const selected = geometry.paths.find((p) => p.playerId === selectedId) ?? geometry.paths[0]
  const selectedPlayer = selected ? playerById(selected.playerId) : undefined

  return (
    <div className="rounded-md border border-line bg-surface p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow">Puntos acumulados</p>
        {selected && (
          <p className="text-xs text-ink-muted truncate">
            <span className="text-ink">{selectedPlayer?.name ?? '?'}</span>
            <span className="tabular text-accent font-semibold ml-2">{selected.total}</span>
          </p>
        )}
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mt-2 w-full"
        style={{ height: 'auto' }}
        role="img"
        aria-label={
          selected
            ? `Evolución de puntos. ${selectedPlayer?.name ?? ''} acumula ${selected.total} en ${timeline.length} partidas.`
            : 'Evolución de puntos'
        }
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={VIEW_W} height={VIEW_H} />
          </clipPath>
        </defs>

        {/* Baseline only. Gridlines would be four more horizontals
            competing with the data in a box this short. */}
        <line
          x1={PAD.left}
          x2={VIEW_W - PAD.right}
          y1={PAD.top + geometry.innerH}
          y2={PAD.top + geometry.innerH}
          stroke="currentColor"
          className="text-line"
          strokeWidth={1}
        />

        <g clipPath={`url(#${clipId})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
          {geometry.paths
            // Draw the selected line last so it sits over the pack.
            .filter((p) => p.playerId !== selected?.playerId)
            .map((p) => (
              <path
                key={p.playerId}
                d={p.d}
                stroke="currentColor"
                className="text-ink-soft"
                strokeOpacity={0.22}
                strokeWidth={1.25}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          {selected && (
            <>
              <motion.path
                key={selected.playerId}
                d={selected.d}
                stroke="currentColor"
                className="text-accent"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                initial={reduced ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              />
              <circle
                cx={selected.end[0]}
                cy={selected.end[1]}
                r={2.75}
                className="text-accent"
                fill="currentColor"
              />
            </>
          )}
        </g>
      </svg>

      <p className="text-[11px] text-ink-soft">
        {timeline.length} partidas · tocá un jugador abajo
      </p>
    </div>
  )
}
