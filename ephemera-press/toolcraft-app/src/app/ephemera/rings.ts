/**
 * Rings mode: circle compositions studied from the moodboard —
 * - typewriter: a repeating printed pattern of typed circle-units
 *   (words letterspaced around each ring, a short word stack at each
 *   centre, sparse dotted inner arcs), like the lavender GO/NOTICE
 *   pattern sheet;
 * - stitched: red running-stitch circles of varied radius crossing one
 *   another near the centre, with solid French-knot dots, like the
 *   embroidery sampler;
 * - orbits: clusters of concentric dotted circles of varying density,
 *   like the Fontana halftone poster.
 */

import {
  clampChars,
  estimateWidth,
  frameOf,
  hashString,
  mulberry32,
  text,
  EPHEMERA_MAX_WORDS_CHARS,
  type EphemeraParams,
  type Frame,
} from "./core";
import type { EphemeraOp } from "./ops";

type Unit = Readonly<{ r: number; x: number; y: number }>;

/** Lays `n` unit centres in a grid whose pitch tightens with gather. */
function unitGrid(p: EphemeraParams, f: Frame, rng: () => number): Unit[] {
  const n = Math.max(1, Math.round(p.ringCount));
  const R = p.ringSize * 0.5 * f.u * 0.62;
  if (n === 1) return [{ r: R * 1.5, x: f.cx, y: f.cy }];
  const cols = Math.ceil(Math.sqrt((n * f.W) / f.H));
  const rows = Math.ceil(n / cols);
  const pitch = R * (2.55 - 0.85 * p.ringGather);
  const gridW = (cols - 1) * pitch;
  const gridH = (rows - 1) * pitch;
  const units: Unit[] = [];
  for (let index = 0; index < n; index += 1) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    units.push({
      r: R * (0.94 + rng() * 0.12),
      x: f.cx - gridW / 2 + col * pitch + (row % 2) * pitch * 0.04,
      y: f.cy - gridH / 2 + row * pitch,
    });
  }
  return units;
}

function circleIntersections(a: Unit, b: Unit): [number, number][] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  if (d === 0 || d > a.r + b.r || d < Math.abs(a.r - b.r)) return [];
  const along = (a.r * a.r - b.r * b.r + d * d) / (2 * d);
  const h2 = a.r * a.r - along * along;
  if (h2 < 0) return [];
  const h = Math.sqrt(h2);
  const mx = a.x + (along * dx) / d;
  const my = a.y + (along * dy) / d;
  return [
    [mx + (h * dy) / d, my - (h * dx) / d],
    [mx - (h * dy) / d, my + (h * dx) / d],
  ];
}

/** Types one word along an arc, character by character, letterspaced. */
function typeAlongArc(
  ops: EphemeraOp[],
  word: string,
  unit: Unit,
  startAngle: number,
  charSize: number,
  color: string,
  rng: () => number,
): number {
  const step = (charSize * 0.78) / unit.r;
  let angle = startAngle;
  for (const ch of word) {
    ops.push(
      text({
        align: "center",
        angle: angle + Math.PI / 2,
        color,
        font: "mono",
        size: charSize,
        text: ch,
        weight: 400,
        x: unit.x + Math.cos(angle) * unit.r + (rng() - 0.5) * charSize * 0.08,
        y: unit.y + Math.sin(angle) * unit.r + (rng() - 0.5) * charSize * 0.08,
      }),
    );
    angle += step;
  }
  return angle;
}

export function ringsOps(p: EphemeraParams): EphemeraOp[] {
  const f = frameOf(p);
  const rng = mulberry32((p.seed ^ 0x51a7) + hashString(p.ringStyle));
  const ops: EphemeraOp[] = [];

  if (p.ringStyle === "typewriter") {
    const units = unitGrid(p, f, rng);
    const wordPool = (
      clampChars(p.ringWords, EPHEMERA_MAX_WORDS_CHARS) ||
      "GO AND NOTICE THE MOTION"
    )
      .toUpperCase()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    for (const unit of units) {
      const charSize = Math.min(f.u * 0.0155, unit.r * 0.16);
      // Words march around the ring with typed gaps between them; the
      // dots at the gaps are the typewriter's period key.
      let angle = rng() * Math.PI * 2;
      const perimeter = Math.PI * 2;
      let travelled = 0;
      let wordIndex = Math.floor(rng() * wordPool.length);
      while (travelled < perimeter * 0.94) {
        const word = wordPool[wordIndex % wordPool.length]!;
        wordIndex += 1;
        const wordArc = (word.length * charSize * 0.78) / unit.r;
        if (travelled + wordArc > perimeter) break;
        const end = typeAlongArc(ops, word, unit, angle, charSize, p.ink, rng);
        const gap = (charSize * (1.1 + rng() * 1.1)) / unit.r;
        if (p.ringMarks) {
          const dotAngle = end + gap / 2;
          ops.push({
            color: p.accent,
            kind: "dot",
            r: charSize * 0.09,
            x: unit.x + Math.cos(dotAngle) * unit.r,
            y: unit.y + Math.sin(dotAngle) * unit.r,
          });
        }
        travelled += wordArc + gap;
        angle = end + gap;
      }
      // A short stacked word pair holds the centre of each unit.
      const centreWords = [
        wordPool[Math.floor(rng() * wordPool.length)]!,
        wordPool[Math.floor(rng() * wordPool.length)]!,
      ];
      centreWords.forEach((word, lineIndex) => {
        ops.push(
          text({
            align: "center",
            color: p.ink,
            font: "mono",
            size: charSize * 0.92,
            text: word,
            weight: 400,
            x: unit.x,
            y: unit.y + (lineIndex - 0.5) * charSize * 1.5,
          }),
        );
      });
      // Sparse dotted inner arcs, like guide circles left in the print.
      const arcCount = 3;
      for (let a = 0; a < arcCount; a += 1) {
        const radius = unit.r * (0.34 + a * 0.19 + rng() * 0.06);
        const arcStart = rng() * Math.PI * 2;
        const arcSpan = Math.PI * (0.8 + rng() * 1.2);
        const dotStep = (charSize * 1.05) / radius;
        for (let t = 0; t < arcSpan; t += dotStep) {
          ops.push({
            color: p.ink,
            kind: "dot",
            r: charSize * 0.06,
            x: unit.x + Math.cos(arcStart + t) * radius,
            y: unit.y + Math.sin(arcStart + t) * radius,
          });
        }
      }
    }
    return ops;
  }

  if (p.ringStyle === "stitched") {
    // Running-stitch circles: each circle is sewn from short chords
    // with thread-width gaps and a little wobble; knots are solid dots.
    const n = Math.max(1, Math.round(p.ringCount));
    const R = p.ringSize * 0.5 * f.u * 1.0;
    // Gather pulls the thread circles into one another: high gather
    // clusters every centre near the middle of the sampler.
    const cluster = R * (0.22 + 0.55 * (1 - p.ringGather));
    const units: Unit[] = [];
    for (let index = 0; index < n; index += 1) {
      const angle = rng() * Math.PI * 2;
      const dist = Math.sqrt(rng()) * cluster;
      units.push({
        r: R * (0.35 + rng() * 0.85),
        x: f.cx + Math.cos(angle) * dist,
        y: f.cy + Math.sin(angle) * dist * 0.8,
      });
    }
    const stitchLen = f.u * 0.014;
    const stitchGap = f.u * 0.008;
    const width = Math.max(0.8, f.u * 0.0013);
    for (const unit of units) {
      const step = (stitchLen + stitchGap) / unit.r;
      const phase = rng() * Math.PI * 2;
      for (let t = 0; t < Math.PI * 2 - step / 2; t += step) {
        const wobble = 1 + (rng() - 0.5) * 0.02;
        const a1 = phase + t;
        const a2 = phase + t + stitchLen / unit.r;
        ops.push({
          color: p.accent,
          kind: "line",
          width,
          x1: unit.x + Math.cos(a1) * unit.r * wobble,
          x2: unit.x + Math.cos(a2) * unit.r * wobble,
          y1: unit.y + Math.sin(a1) * unit.r * wobble,
          y2: unit.y + Math.sin(a2) * unit.r * wobble,
        });
      }
    }
    if (p.ringMarks) {
      // French knots at a handful of the thread crossings.
      const crossings: [number, number][] = [];
      for (let a = 0; a < units.length; a += 1) {
        for (let b = a + 1; b < units.length; b += 1) {
          crossings.push(...circleIntersections(units[a]!, units[b]!));
        }
      }
      const keep = Math.min(crossings.length, 6 + Math.floor(rng() * 9));
      for (let k = 0; k < keep; k += 1) {
        const pick = Math.floor(rng() * crossings.length);
        const [x, y] = crossings[pick]!;
        ops.push({ color: p.accent, kind: "dot", r: f.u * 0.0064, x, y });
      }
      // And a few knots resting on the threads themselves.
      for (const unit of units) {
        if (rng() < 0.55) {
          const angle = rng() * Math.PI * 2;
          ops.push({
            color: p.accent,
            kind: "dot",
            r: f.u * 0.0056,
            x: unit.x + Math.cos(angle) * unit.r,
            y: unit.y + Math.sin(angle) * unit.r,
          });
        }
      }
    }
    return ops;
  }

  // Orbits: halftone clusters — every unit is a nest of concentric
  // dotted circles whose dot spacing loosens outward.
  const units = unitGrid(p, f, rng);
  for (const unit of units) {
    const nestSize = 3 + Math.floor(rng() * 3);
    for (let ring = 0; ring < nestSize; ring += 1) {
      const radius = unit.r * (0.35 + (0.65 * (ring + 1)) / nestSize);
      const density = 0.006 + ring * 0.0035 + rng() * 0.002;
      const count = Math.max(18, Math.floor((Math.PI * 2 * radius) / (f.u * density)));
      const phase = rng() * Math.PI * 2;
      for (let k = 0; k < count; k += 1) {
        const angle = phase + (k / count) * Math.PI * 2;
        ops.push({
          color: p.ink,
          kind: "dot",
          r: f.u * 0.0019,
          x: unit.x + Math.cos(angle) * radius,
          y: unit.y + Math.sin(angle) * radius,
        });
      }
    }
    // Drawn unconditionally so the marks switch never shifts the seeded
    // sequence for later units.
    const haloPhase = rng() * Math.PI;
    if (p.ringMarks) {
      ops.push({
        color: p.accent,
        kind: "dot",
        r: f.u * 0.0042,
        x: unit.x,
        y: unit.y,
      });
      const haloCount = 8;
      for (let k = 0; k < haloCount; k += 1) {
        const angle = haloPhase + (k / haloCount) * Math.PI * 2;
        ops.push({
          color: p.accent,
          kind: "dot",
          r: f.u * 0.0024,
          x: unit.x + Math.cos(angle) * unit.r * 0.18,
          y: unit.y + Math.sin(angle) * unit.r * 0.18,
        });
      }
    }
  }
  return ops;
}
