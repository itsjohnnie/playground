/**
 * Rings mode: overlapping circle compositions — words typed around
 * each ring, thin stitched circles with accent stitch dots, or
 * hand-set dotted orbits.
 */

import {
  clampChars,
  frameOf,
  hashString,
  mulberry32,
  text,
  EPHEMERA_MAX_WORDS_CHARS,
  type EphemeraParams,
  type Frame,
} from "./core";
import type { EphemeraOp } from "./ops";

type Ring = Readonly<{ r: number; x: number; y: number }>;

function ringLayout(p: EphemeraParams, f: Frame, rng: () => number): Ring[] {
  const R = p.ringSize * 0.5 * f.u * 0.92;
  const n = Math.max(1, Math.round(p.ringCount));
  if (n === 1) return [{ r: R, x: f.cx, y: f.cy }];
  const spread = R * (1 - 0.85 * p.ringGather);
  const phase = rng() * Math.PI * 2;
  const rings: Ring[] = [];
  for (let index = 0; index < n; index += 1) {
    const angle = phase + (index / n) * Math.PI * 2;
    rings.push({
      r: R * (0.86 + rng() * 0.14),
      x: f.cx + Math.cos(angle) * spread,
      y: f.cy + Math.sin(angle) * spread,
    });
  }
  return rings;
}

function circleIntersections(a: Ring, b: Ring): [number, number][] {
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

export function ringsOps(p: EphemeraParams): EphemeraOp[] {
  const f = frameOf(p);
  const rng = mulberry32((p.seed ^ 0x51a7) + hashString(p.ringStyle));
  const rings = ringLayout(p, f, rng);
  const ops: EphemeraOp[] = [];
  const hairline = Math.max(0.75, f.u * 0.0014);

  if (p.ringStyle === "typewriter") {
    const sequence = `${clampChars(p.ringWords, EPHEMERA_MAX_WORDS_CHARS) || "GO AND NOTICE THE MOTION"}  `;
    for (const ring of rings) {
      const charSize = Math.min(f.u * 0.024, ring.r * 0.24);
      const count = Math.max(
        sequence.length,
        Math.floor((Math.PI * 2 * ring.r) / (charSize * 0.66)),
      );
      const phase = rng() * Math.PI * 2;
      for (let k = 0; k < count; k += 1) {
        const ch = sequence[k % sequence.length]!;
        if (ch === " ") continue;
        const angle = phase + (k / count) * Math.PI * 2;
        ops.push(
          text({
            align: "center",
            angle: angle + Math.PI / 2,
            color: p.ink,
            font: "mono",
            size: charSize,
            text: ch,
            weight: 400,
            x: ring.x + Math.cos(angle) * ring.r,
            y: ring.y + Math.sin(angle) * ring.r,
          }),
        );
      }
    }
  } else if (p.ringStyle === "stitched") {
    for (const ring of rings) {
      ops.push({
        color: p.ink,
        kind: "circle",
        r: ring.r,
        width: hairline,
        x: ring.x,
        y: ring.y,
      });
      ops.push({
        color: p.accent,
        kind: "dot",
        r: f.u * 0.0042,
        x: ring.x,
        y: ring.y,
      });
    }
  } else {
    // Orbits: hand-set dotted circles with a little radial tremble.
    for (const ring of rings) {
      const count = Math.max(24, Math.floor((Math.PI * 2 * ring.r) / (f.u * 0.0085)));
      const phase = rng() * Math.PI * 2;
      for (let k = 0; k < count; k += 1) {
        const angle = phase + (k / count) * Math.PI * 2;
        const radius = ring.r * (1 + (rng() - 0.5) * 0.012);
        ops.push({
          color: p.ink,
          kind: "dot",
          r: f.u * 0.0021,
          x: ring.x + Math.cos(angle) * radius,
          y: ring.y + Math.sin(angle) * radius,
        });
      }
    }
  }

  if (p.ringMarks) {
    for (let a = 0; a < rings.length; a += 1) {
      for (let b = a + 1; b < rings.length; b += 1) {
        for (const [x, y] of circleIntersections(rings[a]!, rings[b]!)) {
          ops.push({ color: p.accent, kind: "dot", r: f.u * 0.0045, x, y });
        }
      }
    }
    for (const ring of rings) {
      const phase = rng() * Math.PI;
      for (let k = 0; k < 8; k += 1) {
        const angle = phase + (k / 8) * Math.PI * 2;
        ops.push({
          color: p.accent,
          kind: "dot",
          r: f.u * 0.0032,
          x: ring.x + Math.cos(angle) * ring.r * 1.05,
          y: ring.y + Math.sin(angle) * ring.r * 1.05,
        });
      }
    }
  }
  return ops;
}
