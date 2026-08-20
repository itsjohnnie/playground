/**
 * Wheel mode: circular instruments studied from the moodboard —
 * - gauge: a wire gauge disc (the Starrett №283): a scalloped
 *   silhouette whose edge slots narrow geometrically (the real AWG
 *   ratio 0.8905 per gauge), terminal drill holes on the thin slots,
 *   tangential numbers that flip below the equator to stay readable, a
 *   large centre hole with curved maker's arcs above it and the stamped
 *   block below;
 * - knitting: a needle-gauge volvelle (the Boye wheel): a second-ink
 *   outer band with graduated punched holes, curved band lettering, a
 *   sector ring of tiny cells, and a dark banner across the middle with
 *   knockout windows;
 * - dose: a circular slide rule (the pink dose calculator): a 1-2-5
 *   logarithmic ring, a pale rotating disc carrying a time scale and a
 *   comb of spiral isodose curves, and a radial START EXPOSURE arrow;
 * - dial: a drawn clock: light numerals joined by hand-drawn arrows,
 *   loops and zigzags, with one meandering doodle inside.
 */

import {
  frameOf,
  hashString,
  mixHex,
  mulberry32,
  text,
  type EphemeraParams,
} from "./core";
import type { EphemeraOp } from "./ops";

const TAU = Math.PI * 2;

/** Tangential glyph rotation that flips below the equator. */
function readableTangent(angle: number): number {
  const normalized = ((angle % TAU) + TAU) % TAU;
  const below = normalized > 0 && normalized < Math.PI;
  return angle + Math.PI / 2 + (below ? Math.PI : 0);
}

/**
 * Radial spoke rotation: the label advances along the radius (like the
 * numbers on a wire gauge), flipped on the left half to stay readable.
 */
function radialSpoke(angle: number): number {
  return angle + (Math.cos(angle) < -0.0001 ? Math.PI : 0);
}

/** Chaikin corner-cutting, for hand-drawn smoothness on polylines. */
function chaikin(
  points: readonly (readonly [number, number])[],
  rounds: number,
): [number, number][] {
  let current = points.map((point) => [point[0], point[1]] as [number, number]);
  for (let round = 0; round < rounds; round += 1) {
    const next: [number, number][] = [current[0]!];
    for (let index = 0; index < current.length - 1; index += 1) {
      const a = current[index]!;
      const b = current[index + 1]!;
      next.push(
        [a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25],
        [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75],
      );
    }
    next.push(current[current.length - 1]!);
    current = next;
  }
  return current;
}

function arcText(
  ops: EphemeraOp[],
  label: string,
  cx: number,
  cy: number,
  radius: number,
  centerAngle: number,
  size: number,
  color: string,
  weight: 300 | 400 | 700,
  options: Readonly<{ flip?: boolean; font?: "grotesk" | "mono" | "serif" }> = {},
): void {
  const step = (size * 0.72) / radius;
  const flip = options.flip ?? false;
  const direction = flip ? -1 : 1;
  const start = centerAngle - direction * ((label.length - 1) / 2) * step;
  for (let k = 0; k < label.length; k += 1) {
    const ch = label[k]!;
    if (ch === " ") continue;
    const angle = start + direction * k * step;
    ops.push({
      align: "center",
      angle: angle + (flip ? -Math.PI / 2 : Math.PI / 2),
      color,
      font: options.font ?? "grotesk",
      kind: "text",
      size,
      text: ch,
      weight,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  }
}

export function wheelOps(p: EphemeraParams): EphemeraOp[] {
  const f = frameOf(p);
  const rng = mulberry32((p.seed ^ 0x4e21) + hashString(p.wheelInstrument));
  const ops: EphemeraOp[] = [];
  const softInk = mixHex(p.ink, p.paper, 0.45);
  const cx = f.cx;
  const cy = f.cy;
  const R = f.u * 0.41;
  const hairline = Math.max(0.75, f.u * 0.0012);
  const divisions = Math.max(4, Math.round(p.wheelDivisions));
  const ringCount = Math.max(1, Math.round(p.wheelRings));

  if (p.wheelInstrument === "gauge") {
    // --- The scalloped silhouette -----------------------------------
    // Slot n's mouth width follows the real wire-gauge progression
    // w(n) = w0 * 0.8905^n, so low gauges cut wide slots and the last
    // third become slivers that need terminal drill holes.
    const slotDepth = R * 0.1;
    const slots = divisions;
    const w0 = R * 0.14;
    // Gauge 0 sits at about half past four and the numbers climb
    // counterclockwise, exactly like the reference disc.
    const gaugeAt = (position: number) => {
      const zeroPosition = Math.round(slots * 0.42);
      return (((zeroPosition - position) % slots) + slots) % slots;
    };
    const widths: number[] = [];
    for (let position = 0; position < slots; position += 1) {
      widths.push(
        Math.max(R * 0.02, w0 * Math.pow(0.8905, gaugeAt(position))),
      );
    }
    const outline: [number, number][] = [];
    const pushArc = (from: number, to: number, radius: number) => {
      const span = to - from;
      const steps = Math.max(2, Math.ceil(Math.abs(span) / 0.045));
      for (let k = 0; k <= steps; k += 1) {
        const a = from + (span * k) / steps;
        outline.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
      }
    };
    for (let n = 0; n < slots; n += 1) {
      const theta = -Math.PI / 2 + (n / slots) * TAU;
      const nextTheta = -Math.PI / 2 + ((n + 1) / slots) * TAU;
      const alpha = widths[n]! / (2 * R);
      const nextAlpha = widths[(n + 1) % slots]! / (2 * R);
      const h = widths[n]! * 0.4;
      const ux = Math.cos(theta);
      const uy = Math.sin(theta);
      const tx = -uy;
      const ty = ux;
      // Mouth edge, then down one side, around the bottom, back up.
      outline.push([
        cx + Math.cos(theta - alpha) * R,
        cy + Math.sin(theta - alpha) * R,
      ]);
      const bx = cx + ux * (R - slotDepth);
      const by = cy + uy * (R - slotDepth);
      outline.push([bx - tx * h, by - ty * h]);
      for (let k = 1; k < 6; k += 1) {
        const phi = (Math.PI * k) / 6;
        outline.push([
          bx - (tx * Math.cos(phi) + ux * Math.sin(phi)) * h,
          by - (ty * Math.cos(phi) + uy * Math.sin(phi)) * h,
        ]);
      }
      outline.push([bx + tx * h, by + ty * h]);
      outline.push([
        cx + Math.cos(theta + alpha) * R,
        cy + Math.sin(theta + alpha) * R,
      ]);
      pushArc(theta + alpha, nextTheta - nextAlpha, R);
    }
    outline.push(outline[0]!);
    ops.push({
      color: p.ink,
      kind: "poly",
      points: outline,
      width: Math.max(1, f.u * 0.0016),
    });
    // Terminal drill holes keep the thin slots from tearing.
    if (p.wheelNotches) {
      for (let n = 0; n < slots; n += 1) {
        if (widths[n]! > R * 0.032) continue;
        const theta = -Math.PI / 2 + (n / slots) * TAU;
        ops.push({
          color: p.ink,
          kind: "circle",
          r: Math.max(f.u * 0.003, widths[n]! * 0.7),
          width: hairline,
          x: cx + Math.cos(theta) * (R - slotDepth - widths[n]! * 0.5),
          y: cy + Math.sin(theta) * (R - slotDepth - widths[n]! * 0.5),
        });
      }
    }
    // --- Gauge numbers ----------------------------------------------
    // Low gauges take bigger numerals set deeper toward the hub.
    for (let position = 0; position < slots; position += 1) {
      const gauge = gaugeAt(position);
      const theta = -Math.PI / 2 + (position / slots) * TAU;
      const depth = 1 - gauge / slots;
      const radius = R * (0.87 - 0.27 * Math.pow(depth, 1.6));
      const size = R * (0.045 + 0.095 * Math.pow(depth, 1.8));
      ops.push({
        align: "center",
        angle: radialSpoke(theta),
        color: p.ink,
        font: "grotesk",
        kind: "text",
        size,
        text: String(gauge),
        weight: 400,
        x: cx + Math.cos(theta) * radius,
        y: cy + Math.sin(theta) * radius,
      });
    }
    // Decimal wire diameters join on the second ring; extra rings add
    // faint turned guide circles.
    if (ringCount >= 2) {
      for (let n = 0; n < slots; n += 2) {
        const theta = -Math.PI / 2 + (n / slots) * TAU;
        const label = (0.3249 * Math.pow(0.8905, gaugeAt(n)))
          .toFixed(3)
          .replace(/^0/, "");
        ops.push({
          align: "center",
          angle: radialSpoke(theta),
          color: softInk,
          font: "grotesk",
          kind: "text",
          size: R * 0.03,
          text: label,
          weight: 400,
          x: cx + Math.cos(theta) * R * 0.5,
          y: cy + Math.sin(theta) * R * 0.5,
        });
      }
    }
    for (let extra = 3; extra <= ringCount; extra += 1) {
      ops.push({
        color: mixHex(p.ink, p.paper, 0.78),
        kind: "circle",
        r: R * (0.955 - (extra - 3) * 0.018),
        width: hairline * 0.7,
        x: cx,
        y: cy,
      });
    }
    // --- Hub ---------------------------------------------------------
    ops.push({
      color: p.ink,
      kind: "circle",
      r: R * 0.34,
      width: Math.max(1, f.u * 0.0014),
      x: cx,
      y: cy,
    });
    arcText(
      ops,
      "THE EPHEMERA PRESS Co.",
      cx,
      cy,
      R * 0.47,
      -1.78,
      R * 0.046,
      p.ink,
      700,
    );
    arcText(
      ops,
      "PAPER GOODS, U.S.A.",
      cx,
      cy,
      R * 0.4,
      -1.74,
      R * 0.037,
      p.ink,
      400,
    );
    const block = [
      ["U.S. STANDARD GAUGE", R * 0.052, 700],
      ["FOR POEMS AND TYPE", R * 0.046, 700],
      ["INK AND PAPER", R * 0.046, 700],
      [`No. ${p.seed}`, R * 0.058, 400],
    ] as const;
    // The stamped block sits low and left of the hub, clear of the big
    // low-gauge numerals on the right — exactly as on the №283.
    block.forEach(([line, size, weight], index) => {
      ops.push(
        text({
          align: "center",
          color: p.ink,
          font: "grotesk",
          size,
          text: line,
          tracking: size * 0.04,
          weight,
          x: cx - R * 0.22,
          y: cy + R * 0.42 + index * R * 0.062,
        }),
      );
    });
    return ops;
  }

  if (p.wheelInstrument === "knitting") {
    // --- Outer punched band -------------------------------------------
    const bandOuter = R;
    const bandInner = R * 0.87;
    const bandMid = (bandOuter + bandInner) / 2;
    const bandWidth = bandOuter - bandInner;
    ops.push({
      color: p.accent,
      kind: "circle",
      r: bandMid,
      width: bandWidth,
      x: cx,
      y: cy,
    });
    arcText(
      ops,
      "STANDARD GAUGE FOR PINS OTHER THAN DOUBLE POINT STEEL",
      cx,
      cy,
      bandMid,
      Math.PI / 2,
      bandWidth * 0.34,
      p.ink,
      700,
      { flip: true },
    );
    arcText(
      ops,
      "5 POINT STEEL PINS ONLY",
      cx,
      cy,
      bandMid,
      -Math.PI / 4,
      bandWidth * 0.3,
      p.paper,
      700,
    );
    if (p.wheelNotches) {
      // Graduated needle holes punched through the band: poke the pin
      // through to find its size.
      // Holes run from the right side around the bottom to the left,
      // leaving the top band lettering clear.
      const holes = 14;
      for (let k = 0; k < holes; k += 1) {
        const angle = Math.PI * 0.08 + (k / (holes - 1)) * Math.PI * 0.86;
        const size = f.u * (0.0035 + 0.011 * (k / (holes - 1)));
        const hx = cx + Math.cos(angle) * bandMid;
        const hy = cy + Math.sin(angle) * bandMid;
        ops.push(
          { color: p.paper, kind: "dot", r: size, x: hx, y: hy },
          { color: p.ink, kind: "circle", r: size, width: hairline, x: hx, y: hy },
        );
        ops.push({
          align: "center",
          angle: readableTangent(angle),
          color: p.paper,
          font: "grotesk",
          kind: "text",
          size: bandWidth * 0.22,
          text: String(k + 1),
          weight: 400,
          x: cx + Math.cos(angle) * (bandMid + size + bandWidth * 0.18),
          y: cy + Math.sin(angle) * (bandMid + size + bandWidth * 0.18),
        });
      }
    }
    // --- Sector cell rings --------------------------------------------
    const cellOuter = R * 0.85;
    const cellInner = R * 0.34;
    const sectors = Math.max(8, Math.round(divisions / 2));
    const rows = Math.min(ringCount, 4);
    const vocab = [
      "wool",
      "4 ply",
      "silk",
      "cotton",
      "shet.",
      "sport",
      "baby",
      "sock",
      "2 ply",
      "mohair",
    ];
    for (let k = 0; k < sectors; k += 1) {
      const angle = (k / sectors) * TAU - Math.PI / 2;
      ops.push({
        color: p.ink,
        kind: "line",
        width: hairline,
        x1: cx + Math.cos(angle) * cellInner,
        x2: cx + Math.cos(angle) * cellOuter,
        y1: cy + Math.sin(angle) * cellInner,
        y2: cy + Math.sin(angle) * cellOuter,
      });
    }
    for (let row = 0; row <= rows; row += 1) {
      const radius = cellInner + ((cellOuter - cellInner) * row) / Math.max(1, rows);
      ops.push({
        color: p.ink,
        kind: "circle",
        r: radius,
        width: hairline,
        x: cx,
        y: cy,
      });
    }
    for (let k = 0; k < sectors; k += 1) {
      const mid = ((k + 0.5) / sectors) * TAU - Math.PI / 2;
      ops.push({
        align: "center",
        angle: readableTangent(mid),
        color: p.ink,
        font: "grotesk",
        kind: "text",
        size: R * 0.032,
        text: String(k + 1),
        weight: 700,
        x: cx + Math.cos(mid) * (cellOuter - R * 0.028),
        y: cy + Math.sin(mid) * (cellOuter - R * 0.028),
      });
      for (let row = 1; row <= rows; row += 1) {
        const radius =
          cellInner + ((cellOuter - cellInner) * (row - 0.5)) / Math.max(1, rows);
        ops.push({
          align: "center",
          angle: mid + Math.PI / 2,
          color: softInk,
          font: "grotesk",
          kind: "text",
          size: R * 0.021,
          text: vocab[(k * rows + row) % vocab.length]!,
          weight: 400,
          x: cx + Math.cos(mid) * radius,
          y: cy + Math.sin(mid) * radius,
        });
      }
    }
    // --- The banner ---------------------------------------------------
    const bannerW = R * 2.3;
    const bannerH = R * 0.38;
    const bannerY = cy - bannerH * 0.62;
    ops.push({
      fill: p.ink,
      h: bannerH,
      kind: "box",
      w: bannerW,
      x: cx - bannerW / 2,
      y: bannerY,
    });
    const bannerLines = [
      ["“EPHEMERA”", R * 0.062, 700],
      ["KNITTING PIN AND STITCH GAUGE", R * 0.041, 700],
      ["MADE BY THE EPHEMERA PRESS Co.", R * 0.026, 400],
      ["POEMS   RINGS   SHEETS   WHEELS", R * 0.026, 400],
    ] as const;
    bannerLines.forEach(([line, size, weight], index) => {
      ops.push(
        text({
          align: "center",
          color: p.paper,
          font: "grotesk",
          size,
          text: line,
          tracking: size * 0.08,
          weight,
          x: cx,
          y: bannerY + bannerH * (0.16 + index * 0.235),
        }),
      );
    });
    // Two knockout windows showing the disc beneath.
    const windowW = R * 0.15;
    const windowH = R * 0.085;
    for (const side of [-1, 1]) {
      const wx = cx + side * bannerW * 0.31 - windowW / 2;
      const wy = bannerY + bannerH * 0.36;
      ops.push(
        { fill: p.paper, h: windowH, kind: "box", w: windowW, x: wx, y: wy },
        text({
          align: "center",
          color: p.ink,
          font: "grotesk",
          size: windowH * 0.68,
          text: String((p.seed * (side === 1 ? 7 : 3)) % 20 || 8),
          weight: 700,
          x: wx + windowW / 2,
          y: wy + windowH / 2,
        }),
      );
    }
    // Grommet, knocked out of the dark banner.
    ops.push(
      { color: p.paper, kind: "dot", r: R * 0.03, x: cx, y: cy },
      { color: p.ink, kind: "circle", r: R * 0.018, width: hairline, x: cx, y: cy },
    );
    return ops;
  }

  if (p.wheelInstrument === "dose") {
    // --- Outer logarithmic ring ---------------------------------------
    // A 1-2-5 log scale wraps the full circumference: three decades of
    // dose-rate, minor ticks between, numbers flipped to stay readable.
    const outerR = R;
    const discR = R * 0.72;
    const startAngle = -Math.PI / 2;
    const decades = 3;
    ops.push({
      color: p.ink,
      kind: "circle",
      r: outerR,
      width: hairline,
      x: cx,
      y: cy,
    });
    const logPos = (value: number) =>
      startAngle + (Math.log10(value) / decades) * TAU;
    for (let decade = 0; decade < decades; decade += 1) {
      for (let mantissa = 1; mantissa < 10; mantissa += 1) {
        const value = mantissa * Math.pow(10, decade);
        const angle = logPos(value);
        const labelled =
          mantissa === 1 ||
          mantissa === 2 ||
          mantissa === 3 ||
          mantissa === 5 ||
          mantissa === 7;
        ops.push({
          color: p.ink,
          kind: "line",
          width: hairline,
          x1:
            cx +
            Math.cos(angle) * (outerR - (labelled ? f.u * 0.017 : f.u * 0.01)),
          x2: cx + Math.cos(angle) * outerR,
          y1:
            cy +
            Math.sin(angle) * (outerR - (labelled ? f.u * 0.017 : f.u * 0.01)),
          y2: cy + Math.sin(angle) * outerR,
        });
        if (labelled) {
          ops.push({
            align: "center",
            angle: radialSpoke(angle),
            color: p.ink,
            font: "grotesk",
            kind: "text",
            size: f.u * 0.0135,
            text: String(value),
            weight: 400,
            x: cx + Math.cos(angle) * (outerR + f.u * 0.017),
            y: cy + Math.sin(angle) * (outerR + f.u * 0.017),
          });
        }
        // Notches add the finest subdivision ticks between mantissas.
        if (p.wheelNotches && mantissa < 9) {
          for (let sub = 1; sub < 5; sub += 1) {
            const subValue = (mantissa + sub / 5) * Math.pow(10, decade);
            const subAngle = logPos(subValue);
            ops.push({
              color: softInk,
              kind: "line",
              width: hairline * 0.8,
              x1: cx + Math.cos(subAngle) * (outerR - f.u * 0.006),
              x2: cx + Math.cos(subAngle) * outerR,
              y1: cy + Math.sin(subAngle) * (outerR - f.u * 0.006),
              y2: cy + Math.sin(subAngle) * outerR,
            });
          }
        }
      }
    }
    arcText(
      ops,
      "DOSE ROENTGENS",
      cx,
      cy,
      outerR + f.u * 0.036,
      -Math.PI * 0.68,
      f.u * 0.012,
      p.ink,
      400,
    );
    arcText(
      ops,
      "DOSE-RATE ROENTGENS/HOUR",
      cx,
      cy,
      outerR + f.u * 0.036,
      -Math.PI * 0.3,
      f.u * 0.012,
      p.ink,
      400,
    );
    // --- The pale rotating disc ---------------------------------------
    ops.push({ color: mixHex(p.accent, p.paper, 0.76), kind: "dot", r: discR, x: cx, y: cy });
    ops.push({
      color: p.ink,
      kind: "circle",
      r: discR,
      width: hairline,
      x: cx,
      y: cy,
    });
    // Time scale around the disc edge.
    const timeLabels = [
      "1HR",
      "2",
      "4",
      "8",
      "1DAY",
      "2",
      "4",
      "1WK",
      "2",
      "1MO",
      "3",
      "6",
      "1YR",
    ];
    timeLabels.forEach((label, index) => {
      const angle = startAngle + (index / timeLabels.length) * TAU;
      ops.push({
        color: p.ink,
        kind: "line",
        width: hairline,
        x1: cx + Math.cos(angle) * (discR - f.u * 0.01),
        x2: cx + Math.cos(angle) * discR,
        y1: cy + Math.sin(angle) * (discR - f.u * 0.01),
        y2: cy + Math.sin(angle) * discR,
      });
      ops.push({
        align: "center",
        angle: readableTangent(angle + 0.06),
        color: p.ink,
        font: "grotesk",
        kind: "text",
        size: f.u * 0.0105,
        text: label,
        weight: 400,
        x: cx + Math.cos(angle + 0.06) * (discR - f.u * 0.024),
        y: cy + Math.sin(angle + 0.06) * (discR - f.u * 0.024),
      });
    });
    // Intermediate scale rings scale with the Rings control.
    for (let ring = 1; ring < ringCount; ring += 1) {
      const radius = discR * (0.32 + (0.58 * ring) / ringCount);
      ops.push({
        color: softInk,
        kind: "circle",
        r: radius,
        width: hairline * 0.8,
        x: cx,
        y: cy,
      });
    }
    // The comb: a family of logarithmic-spiral isodose curves sweeping
    // from the disc edge in toward the hub.
    const combCount = Math.max(6, Math.round(divisions / 3));
    const spiralK = 0.42;
    for (let curve = 0; curve < combCount; curve += 1) {
      const phase = (curve / combCount) * TAU + rng() * 0.02;
      const points: [number, number][] = [];
      for (let t = 0; t <= 1.001; t += 0.05) {
        const radius = discR * (0.94 - 0.68 * t);
        const angle = phase + (Math.log(radius / (discR * 0.94)) / -spiralK);
        points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
      }
      ops.push({
        color: p.ink,
        kind: "poly",
        points,
        width: hairline * 0.85,
      });
    }
    // "START EXPOSURE" stacks along the upper-left radial, the two
    // lines offset perpendicular to the reading direction.
    const labelAngle = -Math.PI / 4;
    const labelBase = [cx - discR * 0.5, cy - discR * 0.5] as const;
    const perp = [
      -Math.sin(labelAngle) * f.u * 0.019,
      Math.cos(labelAngle) * f.u * 0.019,
    ] as const;
    ops.push(
      text({
        align: "center",
        angle: labelAngle,
        color: p.ink,
        font: "grotesk",
        size: f.u * 0.016,
        text: "START",
        tracking: f.u * 0.002,
        weight: 700,
        x: labelBase[0] - perp[0],
        y: labelBase[1] - perp[1],
      }),
      text({
        align: "center",
        angle: labelAngle,
        color: p.ink,
        font: "grotesk",
        size: f.u * 0.016,
        text: "EXPOSURE",
        tracking: f.u * 0.002,
        weight: 700,
        x: labelBase[0] + perp[0],
        y: labelBase[1] + perp[1],
      }),
    );
    ops.push({
      color: p.ink,
      kind: "line",
      width: Math.max(1, f.u * 0.0016),
      x1: cx - discR * 0.72,
      x2: cx - discR * 0.34,
      y1: cy - discR * 0.72,
      y2: cy - discR * 0.34,
    });
    ops.push(
      text({
        align: "center",
        angle: -Math.PI / 5,
        color: p.ink,
        font: "grotesk",
        size: f.u * 0.011,
        text: "LAND",
        weight: 400,
        x: cx + discR * 0.5,
        y: cy - discR * 0.18,
      }),
    );
    // Grommet.
    ops.push(
      { color: p.ink, kind: "circle", r: R * 0.03, width: hairline, x: cx, y: cy },
      { color: p.ink, kind: "dot", r: R * 0.013, x: cx, y: cy },
    );
    return ops;
  }

  // --- Dial ------------------------------------------------------------
  // A drawn clock: light numerals; each gap to the next numeral gets a
  // hand-drawn connector (arrow, wave, zigzag, or loop); one meandering
  // doodle rests inside; the face itself is the faintest circle.
  const numerals = Math.min(24, Math.max(4, Math.round(divisions / 3)));
  const faceR = R * 0.98;
  ops.push({
    color: mixHex(p.ink, p.paper, 0.82),
    kind: "circle",
    r: faceR,
    width: hairline,
    x: cx,
    y: cy,
  });
  const numeralR = faceR * 0.86;
  // One numeral goes missing, as in the drawn reference.
  const skipped = Math.floor(rng() * numerals);
  for (let k = 0; k < numerals; k += 1) {
    if (k === skipped) continue;
    const angle = (k / numerals) * TAU - Math.PI / 2;
    ops.push(
      text({
        align: "center",
        color: p.ink,
        font: "grotesk",
        size: f.u * 0.052,
        text: String(k === 0 ? numerals : k),
        weight: 400,
        x: cx + Math.cos(angle) * numeralR,
        y: cy + Math.sin(angle) * numeralR,
      }),
    );
  }
  if (p.wheelNotches) {
    for (let k = 0; k < divisions; k += 1) {
      const angle = (k / divisions) * TAU - Math.PI / 2;
      ops.push({
        color: softInk,
        kind: "line",
        width: hairline * 0.8,
        x1: cx + Math.cos(angle) * faceR * 0.985,
        x2: cx + Math.cos(angle) * faceR,
        y1: cy + Math.sin(angle) * faceR * 0.985,
        y2: cy + Math.sin(angle) * faceR,
      });
    }
  }
  for (let j = 0; j < ringCount - 1; j += 1) {
    ops.push({
      color: mixHex(p.ink, p.paper, 0.85),
      kind: "circle",
      r: faceR * (0.24 + (0.34 * (j + 1)) / ringCount),
      width: hairline * 0.7,
      x: cx,
      y: cy,
    });
  }
  const lineWidth = Math.max(1.4, f.u * 0.0034);
  const addArrowHead = (
    tip: readonly [number, number],
    back: readonly [number, number],
  ) => {
    const heading = Math.atan2(tip[1] - back[1], tip[0] - back[0]);
    for (const side of [-1, 1]) {
      ops.push({
        color: p.ink,
        kind: "line",
        width: lineWidth,
        x1: tip[0],
        x2: tip[0] - Math.cos(heading + side * 0.5) * f.u * 0.02,
        y1: tip[1],
        y2: tip[1] - Math.sin(heading + side * 0.5) * f.u * 0.02,
      });
    }
  };
  // Connectors between consecutive numerals.
  for (let k = 0; k < numerals; k += 1) {
    const styleRoll = rng();
    const fromAngle = (k / numerals) * TAU - Math.PI / 2;
    const toAngle = ((k + 1) / numerals) * TAU - Math.PI / 2;
    if (styleRoll < 0.3) continue;
    const gapStart = fromAngle + (toAngle - fromAngle) * 0.32;
    const gapEnd = fromAngle + (toAngle - fromAngle) * 0.74;
    const points: [number, number][] = [];
    const steps = 10;
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      const angle = gapStart + (gapEnd - gapStart) * t;
      let radius = numeralR;
      if (styleRoll < 0.55) {
        // plain arc arrow
      } else if (styleRoll < 0.75) {
        // wave
        radius = numeralR * (1 + 0.028 * Math.sin(t * Math.PI * 3));
      } else if (styleRoll < 0.9) {
        // zigzag
        radius = numeralR * (1 + 0.024 * (Math.abs(((t * 4) % 2) - 1) - 0.5));
      } else {
        // loop-de-loop: a little circle detour mid-gap
        const loop = Math.sin(t * Math.PI);
        radius = numeralR * (1 + 0.05 * Math.sin(t * TAU * 1.5) * loop);
      }
      points.push([
        cx + Math.cos(angle) * radius,
        cy + Math.sin(angle) * radius,
      ]);
    }
    const smoothed = styleRoll >= 0.75 && styleRoll < 0.9 ? points : chaikin(points, 2);
    ops.push({ color: p.ink, kind: "poly", points: smoothed, width: lineWidth });
    addArrowHead(smoothed[smoothed.length - 1]!, smoothed[smoothed.length - 2]!);
  }
  // The meandering doodle inside the face.
  const doodle: [number, number][] = [];
  let dx = cx - faceR * 0.16;
  let dy = cy + faceR * 0.1;
  let heading = rng() * TAU;
  doodle.push([dx, dy]);
  const segments = 15;
  for (let seg = 0; seg < segments; seg += 1) {
    // Mostly gentle turns, with an occasional full loop-de-loop.
    if (seg % 6 === 3) {
      const loopR = faceR * (0.05 + rng() * 0.05);
      const loopTurns = 9;
      for (let k = 1; k <= loopTurns; k += 1) {
        heading += TAU / loopTurns;
        dx += Math.cos(heading) * loopR * 0.7;
        dy += Math.sin(heading) * loopR * 0.7;
        doodle.push([dx, dy]);
      }
      continue;
    }
    heading += (rng() - 0.5) * 1.7;
    const step = faceR * (0.1 + rng() * 0.1);
    dx += Math.cos(heading) * step;
    dy += Math.sin(heading) * step;
    // Keep the doodle inside the face.
    const away = Math.hypot(dx - cx, dy - cy);
    if (away > faceR * 0.62) {
      heading = Math.atan2(cy - dy, cx - dx) + (rng() - 0.5) * 0.7;
      dx = cx + ((dx - cx) / away) * faceR * 0.62;
      dy = cy + ((dy - cy) / away) * faceR * 0.62;
    }
    doodle.push([dx, dy]);
  }
  ops.push({
    color: p.ink,
    kind: "poly",
    points: chaikin(doodle, 3),
    width: lineWidth,
  });
  return ops;
}
