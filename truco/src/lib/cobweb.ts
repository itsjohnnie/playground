// Geometry for the corner cobweb that creeps into a team panel once
// they stop scoring. Kept apart from the component so it stays pure —
// it can be rendered headless while tuning the look, and the component
// file goes on exporting only a component (fast refresh).
//
// The web is spun from the top-right corner outward, the way an orb
// weaver actually builds one: straight radials under tension, then
// capture threads sagging between them. Three things keep it from
// reading as clip-art —
//
//  - every radius is jittered, so no ring is a true circle;
//  - the capture threads bow back toward the corner (`SAG`);
//  - past the first tier a segment is missing, because a web nobody
//    maintains tears.
//
// The jitter is seeded, not random: a web that reshuffled itself on
// every score tap would read as noise rather than as neglect.

// Everything is spun from the top-right of a 100×100 viewBox.
const ANCHOR_X = 100
const ANCHOR_Y = 0

// Base geometry, before jitter. Angles are degrees from the +x axis;
// SVG's y points down, so 90° is straight down and 180° straight left —
// the quarter turn that faces into the panel.
const BASE_ANGLES = [93, 109, 126, 143, 159, 174]
const BASE_RINGS = [23, 39, 56, 75, 96]

// How far the capture threads bow back toward the corner. 1 would be a
// taut arc; much below 0.8 starts to look like a spiral staircase.
const SAG = 0.86

// The drought grows the web rather than just fading it up. Every tier
// is a *complete* web — enough rings to fill its radials — because a
// couple of rings on long spokes reads as a paper fan, not a web. What
// deepens is the size and the presence.
const TIERS = [
  { radials: 5, rings: 3, scale: 0.66, opacity: 0.2 },
  { radials: 6, rings: 4, scale: 0.84, opacity: 0.28 },
  { radials: 6, rings: 5, scale: 1.0, opacity: 0.36 },
]

/** Deterministic 0..1 from an integer seed. */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** Signed jitter in ±`amount`. */
function wobble(seed: number, amount: number): number {
  return (rand(seed) - 0.5) * amount
}

function pt(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [ANCHOR_X + r * Math.cos(rad), ANCHOR_Y + r * Math.sin(rad)]
}

const f = (n: number) => n.toFixed(2)

export function tierFor(rounds: number): number {
  if (rounds >= 7) return 2
  if (rounds >= 5) return 1
  return 0
}

export interface Web {
  radialPaths: string[]
  ringPaths: string[]
  strand: string | null
  opacity: number
}

export function buildWeb(tier: number): Web {
  const { radials, rings, scale, opacity } = TIERS[tier]

  const angles = BASE_ANGLES.slice(0, radials).map((a, i) => a + wobble(i + 1, 6))
  const radii = BASE_RINGS.slice(0, rings).map((r, j) => r * scale * (1 + wobble(j + 11, 0.08)))

  // Per-intersection radius, so no ring closes as a true circle.
  const at = (ring: number, radial: number) =>
    radii[ring] * (1 + wobble(ring * 7 + radial * 13 + 3, 0.1))

  // Radials stop just past the outermost capture thread. Any further
  // and the bare spokes fan out and stop reading as a web.
  const reach = radii[radii.length - 1] * 1.03
  const radialPaths = angles.map((deg, i) => {
    const [x, y] = pt(reach * (1 + wobble(i + 31, 0.06)), deg)
    return `M${ANCHOR_X} ${ANCHOR_Y} L${f(x)} ${f(y)}`
  })

  // One torn segment on the outermost ring, from the second tier on.
  const tornRing = radii.length - 1
  const tornSeg = tier > 0 ? Math.floor(rand(tier + 41) * (angles.length - 1)) : -1

  const ringPaths = radii.map((_, ring) => {
    let d = ''
    for (let i = 0; i < angles.length - 1; i++) {
      if (ring === tornRing && i === tornSeg) continue
      const [x1, y1] = pt(at(ring, i), angles[i])
      const [x2, y2] = pt(at(ring, i + 1), angles[i + 1])
      const mid = (angles[i] + angles[i + 1]) / 2
      const [cx, cy] = pt(((at(ring, i) + at(ring, i + 1)) / 2) * SAG, mid)
      d += `M${f(x1)} ${f(y1)} Q${f(cx)} ${f(cy)} ${f(x2)} ${f(y2)} `
    }
    return d.trim()
  })

  // A single strand hanging loose off the torn edge, top tier only.
  let strand: string | null = null
  if (tier === 2 && tornSeg >= 0) {
    const [sx, sy] = pt(at(tornRing, tornSeg), angles[tornSeg])
    strand =
      `M${f(sx)} ${f(sy)} ` +
      `q${f(-3 + wobble(53, 3))} ${f(11)} ${f(-1.5)} ${f(21)} ` +
      `q${f(1.5)} ${f(7)} ${f(-2.5)} ${f(12)}`
  }

  return { radialPaths, ringPaths, strand, opacity }
}
