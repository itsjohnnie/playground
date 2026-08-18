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
//  - once it has been up a while a segment is missing, because a web
//    nobody maintains tears.
//
// The jitter is seeded, not random: a web that reshuffled itself on
// every score tap would read as noise rather than as neglect.

import { SEQUIA_ROUNDS } from '@/utils/scoring'

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

// The drought grows the web rather than just fading it up, and it keeps
// growing: there's no round at which a team is "as cold as it gets".
// Growth is asymptotic rather than linear — the first few dry rounds
// move it visibly, then it eases toward a ceiling, so a blowout leaves
// a web that has clearly taken over the corner without ever swallowing
// the panel.
//
// `TAU` is the drought length (in rounds past onset) at which growth
// has run ~63% of its course.
const TAU = 6

// The web fills its own viewBox first, then the whole thing is scaled
// up on screen. Splitting it this way matters: the geometry is spun
// into a 100×100 box and SVG clips to that box, so growing the radii
// past it would shear the outer rings off. Once the box is full, the
// element grows instead.
const FILL_MIN = 0.66     // radius scale at onset
const FILL_MAX = 1.0      // radius scale once it fills the viewBox
const SIZE_MIN = 1.0      // on-screen multiplier at onset
const SIZE_MAX = 1.7      // …and at the far end of a long drought
const OPACITY_MIN = 0.2
const OPACITY_MAX = 0.5

// Fraction of total growth spent filling the viewBox. Past this the
// geometry is done and further drought only enlarges the element.
const FILL_PHASE = 0.5

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/**
 * Drought progress, 0..1. 0 the round the web first appears, easing
 * toward 1 the longer the team stays cold. Never quite reaches 1, so
 * the web is always still creeping.
 */
export function growthFor(rounds: number): number {
  const t = Math.max(0, rounds - SEQUIA_ROUNDS)
  return 1 - Math.exp(-t / TAU)
}

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

export interface Web {
  radialPaths: string[]
  ringPaths: string[]
  strand: string | null
  opacity: number
  /**
   * On-screen multiplier for the whole web, anchored at the corner.
   * Applied as a transform, so the threads keep their drawn width —
   * they carry `vector-effect: non-scaling-stroke`, which is what
   * keeps silk reading as silk however far the web spreads.
   */
  sizeScale: number
}

export function buildWeb(rounds: number): Web {
  const g = growthFor(rounds)

  // Geometry finishes filling the viewBox over the first half of the
  // curve; the element carries the growth from there.
  const fill = clamp01(g / FILL_PHASE)
  const scale = lerp(FILL_MIN, FILL_MAX, fill)
  const sizeScale = lerp(SIZE_MIN, SIZE_MAX, g)
  const opacity = lerp(OPACITY_MIN, OPACITY_MAX, g)

  // Structure steps rather than tweens — a fractional ring is not a
  // thing. A sixth radial comes in early, and the last two rings land
  // as the web fills out.
  const radials = g < 0.18 ? 5 : 6
  const rings = Math.min(BASE_RINGS.length, 3 + Math.floor(fill / 0.4))

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

  // One torn segment on the outermost ring, once the web is old enough
  // to have gone unmaintained. Seeded off the ring count rather than
  // the drought itself, so the tear stays put as the web keeps growing
  // instead of jumping to a new segment every round.
  const tornRing = radii.length - 1
  const torn = g >= 0.18
  const tornSeg = torn ? Math.floor(rand(radii.length + 41) * (angles.length - 1)) : -1

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

  // A single strand hanging loose off the torn edge, once the drought
  // is properly long.
  let strand: string | null = null
  if (g >= 0.45 && tornSeg >= 0) {
    const [sx, sy] = pt(at(tornRing, tornSeg), angles[tornSeg])
    strand =
      `M${f(sx)} ${f(sy)} ` +
      `q${f(-3 + wobble(53, 3))} ${f(11)} ${f(-1.5)} ${f(21)} ` +
      `q${f(1.5)} ${f(7)} ${f(-2.5)} ${f(12)}`
  }

  return { radialPaths, ringPaths, strand, opacity, sizeScale }
}
