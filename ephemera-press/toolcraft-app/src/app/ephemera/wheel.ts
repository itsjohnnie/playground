/**
 * Wheel mode: circular calculating instruments — a numbered wire
 * gauge, a knitting stitch gauge with an accent band and needle holes,
 * a log-scale dose calculator with an accent spiral, and a scribbled
 * dial.
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

function arcText(
  ops: EphemeraOp[],
  label: string,
  cx: number,
  cy: number,
  radius: number,
  centerAngle: number,
  size: number,
  color: string,
  weight: 400 | 700,
): void {
  const step = (size * 0.72) / radius;
  const start = centerAngle - ((label.length - 1) / 2) * step;
  for (let k = 0; k < label.length; k += 1) {
    const ch = label[k]!;
    if (ch === " ") continue;
    const angle = start + k * step;
    ops.push({
      align: "center",
      angle: angle + Math.PI / 2,
      color,
      font: "grotesk",
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
  const R = f.u * 0.4;
  const hairline = Math.max(0.75, f.u * 0.0012);
  const divisions = Math.max(4, Math.round(p.wheelDivisions));
  const ringCount = Math.max(1, Math.round(p.wheelRings));

  const rim = () => {
    ops.push({
      color: p.ink,
      kind: "circle",
      r: R,
      width: Math.max(1, f.u * 0.002),
      x: cx,
      y: cy,
    });
    if (p.wheelNotches) {
      for (let k = 0; k < divisions; k += 1) {
        const angle = (k / divisions) * Math.PI * 2 - Math.PI / 2;
        ops.push({
          color: p.ink,
          kind: "line",
          width: Math.max(1, f.u * 0.0032),
          x1: cx + Math.cos(angle) * R * 0.972,
          x2: cx + Math.cos(angle) * R * 1.024,
          y1: cy + Math.sin(angle) * R * 0.972,
          y2: cy + Math.sin(angle) * R * 1.024,
        });
      }
    }
  };

  if (p.wheelInstrument === "gauge") {
    rim();
    for (let j = 0; j < ringCount; j += 1) {
      const radius = R * (0.9 - j * (0.52 / Math.max(1, ringCount)));
      const size = Math.min(f.u * 0.017, ((Math.PI * 2 * radius) / divisions) * 0.44);
      for (let k = 0; k < divisions; k += 1) {
        const angle = (k / divisions) * Math.PI * 2 - Math.PI / 2;
        const label =
          j % 2 === 0
            ? String(k + 1)
            : (0.005 * Math.pow(1.122, k)).toFixed(3).replace(/^0/, "");
        ops.push({
          align: "center",
          angle: angle + Math.PI / 2,
          color: j % 2 === 0 ? p.ink : softInk,
          font: "grotesk",
          kind: "text",
          size,
          text: label,
          weight: 400,
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
        });
      }
    }
    ops.push({
      color: p.ink,
      kind: "circle",
      r: R * 0.12,
      width: hairline,
      x: cx,
      y: cy,
    });
    const highlight = (Math.floor(rng() * divisions) / divisions) * Math.PI * 2 - Math.PI / 2;
    ops.push({
      color: p.accent,
      kind: "dot",
      r: f.u * 0.005,
      x: cx + Math.cos(highlight) * R * 0.945,
      y: cy + Math.sin(highlight) * R * 0.945,
    });
    const brand = [
      ["THE EPHEMERA PRESS Co.", f.u * 0.016, 400],
      ["U.S. STANDARD GAUGE", f.u * 0.02, 700],
      ["FOR POEMS AND TYPE", f.u * 0.014, 400],
      [`No. ${p.seed}`, f.u * 0.018, 400],
    ] as const;
    brand.forEach(([line, size, weight], index) => {
      ops.push(
        text({
          align: "center",
          color: p.ink,
          font: "serif",
          size,
          text: line,
          weight,
          x: cx,
          y: cy - R * 0.42 + index * f.u * 0.03,
        }),
      );
    });
    return ops;
  }

  if (p.wheelInstrument === "knitting") {
    rim();
    arcText(
      ops,
      "EPHEMERA PRESS",
      cx,
      cy,
      R * 0.84,
      -Math.PI / 2,
      f.u * 0.028,
      p.ink,
      700,
    );
    ops.push(
      text({
        align: "center",
        color: p.ink,
        font: "grotesk",
        size: f.u * 0.018,
        text: "KNITTING PIN",
        tracking: f.u * 0.003,
        weight: 700,
        x: cx,
        y: cy - R * 0.5,
      }),
      text({
        align: "center",
        color: p.ink,
        font: "grotesk",
        size: f.u * 0.014,
        text: "AND STITCH GAUGE",
        tracking: f.u * 0.002,
        weight: 400,
        x: cx,
        y: cy - R * 0.44,
      }),
    );
    ops.push({
      color: p.accent,
      kind: "circle",
      r: R * 0.66,
      width: f.u * 0.036,
      x: cx,
      y: cy,
    });
    for (let j = 0; j < ringCount; j += 1) {
      const radius = R * (0.3 + (0.42 * (j + 1)) / ringCount);
      ops.push({
        color: p.ink,
        kind: "circle",
        r: radius,
        width: hairline,
        x: cx,
        y: cy,
      });
    }
    const size = Math.min(f.u * 0.014, ((Math.PI * 2 * R * 0.78) / divisions) * 0.5);
    for (let k = 0; k < divisions; k += 1) {
      const angle = (k / divisions) * Math.PI * 2 - Math.PI / 2;
      ops.push({
        color: p.ink,
        kind: "line",
        width: hairline,
        x1: cx + Math.cos(angle) * R * 0.74,
        x2: cx + Math.cos(angle) * R * 0.78,
        y1: cy + Math.sin(angle) * R * 0.74,
        y2: cy + Math.sin(angle) * R * 0.78,
      });
      if (k % 2 === 0) {
        ops.push({
          align: "center",
          angle: angle + Math.PI / 2,
          color: p.ink,
          font: "grotesk",
          kind: "text",
          size,
          text: String(k + 1),
          weight: 400,
          x: cx + Math.cos(angle) * R * 0.71,
          y: cy + Math.sin(angle) * R * 0.71,
        });
      }
    }
    const holes = 11;
    for (let k = 0; k < holes; k += 1) {
      const angle = (k / holes) * Math.PI * 2 + rng() * 0.05;
      ops.push({
        color: p.ink,
        kind: "circle",
        r: f.u * (0.005 + 0.012 * (k / holes)) * (0.8 + rng() * 0.4),
        width: hairline,
        x: cx + Math.cos(angle) * R * 0.18,
        y: cy + Math.sin(angle) * R * 0.18,
      });
    }
    return ops;
  }

  if (p.wheelInstrument === "dose") {
    rim();
    const startAngle = (-220 * Math.PI) / 180;
    const endAngle = (40 * Math.PI) / 180;
    const decades = [1, 2, 5];
    const arcLabels = ["DOSE", "RATE", "TIME", "EXPOSURE", "DRIFT", "LAND"];
    for (let j = 0; j < ringCount; j += 1) {
      const radius = R * (0.34 + (0.58 * (j + 1)) / ringCount);
      ops.push({
        color: p.ink,
        end: endAngle,
        kind: "arc",
        r: radius,
        start: startAngle,
        width: hairline,
        x: cx,
        y: cy,
      });
      const size = Math.min(f.u * 0.012, ((endAngle - startAngle) * radius) / divisions);
      for (let k = 0; k < divisions; k += 1) {
        const t = k / Math.max(1, divisions - 1);
        const angle = startAngle + t * (endAngle - startAngle);
        const major = k % Math.max(2, Math.floor(divisions / 9)) === 0;
        ops.push({
          color: p.ink,
          kind: "line",
          width: hairline,
          x1: cx + Math.cos(angle) * (radius - (major ? f.u * 0.012 : f.u * 0.006)),
          x2: cx + Math.cos(angle) * radius,
          y1: cy + Math.sin(angle) * (radius - (major ? f.u * 0.012 : f.u * 0.006)),
          y2: cy + Math.sin(angle) * radius,
        });
        if (major) {
          const decade = Math.floor((t * 3) % 3);
          const value = decades[k % 3]! * Math.pow(10, decade);
          ops.push({
            align: "center",
            angle: angle + Math.PI / 2,
            color: softInk,
            font: "grotesk",
            kind: "text",
            size,
            text: String(value),
            weight: 400,
            x: cx + Math.cos(angle) * (radius - f.u * 0.02),
            y: cy + Math.sin(angle) * (radius - f.u * 0.02),
          });
        }
      }
      arcText(
        ops,
        arcLabels[j % arcLabels.length]!,
        cx,
        cy,
        radius + f.u * 0.012,
        startAngle + 0.25,
        f.u * 0.011,
        p.accent,
        400,
      );
    }
    const spiral: [number, number][] = [];
    const phase = rng() * Math.PI;
    for (let t = 0; t < 3.6 * Math.PI; t += 0.09) {
      const radius = R * 0.09 * Math.exp(0.166 * t);
      if (radius > R * 0.9) break;
      spiral.push([
        cx + Math.cos(t + phase) * radius,
        cy + Math.sin(t + phase) * radius,
      ]);
    }
    ops.push({
      color: p.accent,
      kind: "poly",
      points: spiral,
      width: Math.max(0.8, f.u * 0.0015),
    });
    const last = spiral[spiral.length - 1];
    if (last) {
      ops.push(
        text({
          align: "left",
          color: p.accent,
          font: "mono",
          size: f.u * 0.013,
          text: "START",
          weight: 700,
          x: last[0] + f.u * 0.008,
          y: last[1],
        }),
      );
    }
    return ops;
  }

  // Dial: a wandering clock face with scribbled hands.
  rim();
  const numerals = Math.min(24, Math.max(4, Math.round(divisions / 3)));
  for (let k = 0; k < numerals; k += 1) {
    const angle = (k / numerals) * Math.PI * 2 - Math.PI / 2;
    ops.push(
      text({
        align: "center",
        color: p.ink,
        font: "mono",
        size: f.u * 0.034,
        text: String(k === 0 ? numerals : k),
        weight: 400,
        x: cx + Math.cos(angle) * R * 0.86,
        y: cy + Math.sin(angle) * R * 0.86,
      }),
    );
  }
  for (let j = 0; j < ringCount - 1; j += 1) {
    ops.push({
      color: softInk,
      kind: "circle",
      r: R * (0.2 + (0.4 * (j + 1)) / ringCount),
      width: hairline * 0.8,
      x: cx,
      y: cy,
    });
  }
  const hands = 2;
  for (let h = 0; h < hands; h += 1) {
    const targetIndex = Math.floor(rng() * numerals);
    const target = (targetIndex / numerals) * Math.PI * 2 - Math.PI / 2;
    const reach = R * (0.45 + h * 0.22);
    const points: [number, number][] = [[cx, cy]];
    let x = cx;
    let y = cy;
    const steps = 14;
    for (let k = 1; k <= steps; k += 1) {
      const t = k / steps;
      const wobble = Math.sin(t * Math.PI * (3 + h)) * f.u * 0.02 * (1 - t);
      const nx = cx + Math.cos(target) * reach * t - Math.sin(target) * wobble;
      const ny = cy + Math.sin(target) * reach * t + Math.cos(target) * wobble;
      x = nx + (rng() - 0.5) * f.u * 0.006;
      y = ny + (rng() - 0.5) * f.u * 0.006;
      points.push([x, y]);
    }
    ops.push({
      color: p.ink,
      kind: "poly",
      points,
      width: Math.max(1, f.u * 0.0022),
    });
    const tip = points[points.length - 1]!;
    const back = points[points.length - 2]!;
    const heading = Math.atan2(tip[1] - back[1], tip[0] - back[0]);
    for (const side of [-1, 1]) {
      ops.push({
        color: p.ink,
        kind: "line",
        width: Math.max(1, f.u * 0.0022),
        x1: tip[0],
        x2: tip[0] - Math.cos(heading + side * 0.5) * f.u * 0.016,
        y1: tip[1],
        y2: tip[1] - Math.sin(heading + side * 0.5) * f.u * 0.016,
      });
    }
  }
  const accentIndex = Math.floor(rng() * numerals);
  const accentAngle = (accentIndex / numerals) * Math.PI * 2 - Math.PI / 2;
  const arrowR = R * 0.7;
  const arc: [number, number][] = [];
  for (let t = -0.22; t <= 0.22; t += 0.055) {
    arc.push([
      cx + Math.cos(accentAngle + t) * arrowR,
      cy + Math.sin(accentAngle + t) * arrowR,
    ]);
  }
  ops.push({
    color: p.accent,
    kind: "poly",
    points: arc,
    width: Math.max(1, f.u * 0.002),
  });
  return ops;
}
