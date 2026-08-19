/**
 * Tour mode: minimal concert bills — a diagonal stair of shows with a
 * thin rule, a date circle, or a centred ledger with accent dates.
 */

import {
  clampChars,
  frameOf,
  hashString,
  mixHex,
  mulberry32,
  text,
  EPHEMERA_MAX_TOUR_LINES,
  EPHEMERA_MAX_WORDS_CHARS,
  type EphemeraParams,
} from "./core";
import type { EphemeraOp } from "./ops";

type TourEntry = Readonly<{ city: string; date: string; venue: string }>;

export function parseTourDates(dates: string): TourEntry[] {
  return dates
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, EPHEMERA_MAX_TOUR_LINES)
    .map((line) => {
      const parts = line
        .split(/\s{2,}|\t|\|/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      return {
        city: parts[1] ?? "",
        date: parts[0] ?? "",
        venue: parts[2] ?? "",
      };
    });
}

export function tourOps(p: EphemeraParams): EphemeraOp[] {
  const f = frameOf(p);
  const rng = mulberry32((p.seed ^ 0x70a2) + hashString(p.tourLayout));
  const entries = parseTourDates(p.tourDates);
  const artist = clampChars(p.tourArtist, EPHEMERA_MAX_WORDS_CHARS) || "SOLSTICE";
  const softInk = mixHex(p.ink, p.paper, 0.45);
  const base = f.u * 0.0155;
  const ops: EphemeraOp[] = [];
  if (entries.length === 0) {
    ops.push(
      text({
        align: "left",
        color: p.ink,
        font: "grotesk",
        size: f.u * 0.02,
        text: artist,
        tracking: f.u * 0.008,
        weight: 400,
        x: f.m,
        y: f.m,
      }),
    );
    return ops;
  }
  const n = entries.length;

  if (p.tourLayout === "diagonal") {
    ops.push(
      text({
        align: "left",
        color: p.ink,
        font: "grotesk",
        size: f.u * 0.02,
        text: artist,
        tracking: f.u * 0.009,
        weight: 400,
        x: f.m,
        y: f.m,
      }),
    );
    const yTop = f.m * 2.1;
    const yBottom = f.H - f.m * 1.6;
    const xTop = f.W - f.m * 1.3;
    const xBottom = f.m * 1.3 + (f.W - f.m * 2.6) * 0.42;
    entries.forEach((entry, index) => {
      const t = n === 1 ? 0 : index / (n - 1);
      const y = yTop + t * (yBottom - yTop);
      const x = xTop + t * (xBottom - xTop) + (rng() - 0.5) * base * 0.9;
      ops.push(
        text({
          align: "right",
          color: p.ink,
          font: "grotesk",
          size: base,
          text: entry.city,
          weight: 400,
          x,
          y,
        }),
      );
      if (entry.venue) {
        ops.push(
          text({
            align: "right",
            color: softInk,
            font: "grotesk",
            size: base * 0.82,
            text: `at ${entry.venue}`,
            weight: 400,
            x,
            y: y + base * 1.2 * p.tourLeading,
          }),
        );
      }
      ops.push(
        text({
          align: "left",
          color: softInk,
          font: "grotesk",
          size: base * 0.9,
          text: entry.date,
          weight: 400,
          x: x + base * 1.6,
          y,
        }),
      );
    });
    ops.push({
      color: p.ink,
      kind: "line",
      width: Math.max(0.7, f.u * 0.0009),
      x1: xTop + base * 0.8,
      x2: xBottom + base * 0.8,
      y1: yTop - base * 1.4,
      y2: yBottom + base * 1.4,
    });
    return ops;
  }

  if (p.tourLayout === "orbit") {
    const R = f.u * 0.3;
    const cx = f.cx + f.u * 0.03;
    const cy = f.cy - f.u * 0.06;
    ops.push({
      color: p.ink,
      kind: "circle",
      r: R,
      width: Math.max(0.7, f.u * 0.001),
      x: cx,
      y: cy,
    });
    ops.push({
      color: p.ink,
      kind: "line",
      width: Math.max(0.7, f.u * 0.001),
      x1: cx,
      x2: cx,
      y1: cy - R - f.u * 0.015,
      y2: cy - R + f.u * 0.015,
    });
    const phase = -Math.PI / 2 + rng() * 0.4;
    entries.forEach((entry, index) => {
      const angle = phase + ((index + 0.5) / n) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const outer = R + base * 1.3 * p.tourLeading;
      const align = cos >= 0 ? "left" : "right";
      ops.push(
        text({
          align,
          color: p.ink,
          font: "grotesk",
          size: base,
          text: entry.venue ? `${entry.city} · ${entry.venue}` : entry.city,
          weight: 400,
          x: cx + cos * outer,
          y: cy + sin * outer,
        }),
      );
      ops.push(
        text({
          align: cos >= 0 ? "right" : "left",
          color: softInk,
          font: "grotesk",
          size: base * 0.82,
          text: entry.date,
          weight: 400,
          x: cx + cos * (R - base * 1.1),
          y: cy + sin * (R - base * 1.1),
        }),
      );
    });
    ops.push(
      text({
        align: "left",
        color: p.ink,
        font: "grotesk",
        size: f.u * 0.024,
        text: artist,
        tracking: f.u * 0.008,
        weight: 400,
        x: f.m,
        y: f.H - f.m * 1.2,
      }),
    );
    return ops;
  }

  // Ledger: a centred bill with accent dates, like the red-and-grey
  // recital posters.
  ops.push(
    text({
      align: "center",
      color: p.ink,
      font: "grotesk",
      size: f.u * 0.03,
      text: artist.toUpperCase(),
      tracking: f.u * 0.012,
      weight: 400,
      x: f.cx,
      y: f.m * 1.4,
    }),
  );
  const top = f.m * 2.7;
  const lh = Math.min(base * 3 * p.tourLeading, (f.H - top - f.m) / n);
  entries.forEach((entry, index) => {
    const y = top + index * lh;
    const xc = f.cx + (rng() - 0.5) * f.W * 0.16;
    ops.push(
      text({
        align: "right",
        color: p.accent,
        font: "grotesk",
        size: base * 0.9,
        text: entry.date,
        weight: 700,
        x: xc - base * 0.9,
        y,
      }),
    );
    ops.push(
      text({
        align: "left",
        color: p.ink,
        font: "grotesk",
        size: base,
        text: entry.city,
        weight: 700,
        x: xc + base * 0.9,
        y,
      }),
    );
    if (entry.venue) {
      ops.push(
        text({
          align: "left",
          color: softInk,
          font: "grotesk",
          size: base * 0.82,
          text: entry.venue,
          weight: 400,
          x: xc + base * 0.9,
          y: y + base * 1.15,
        }),
      );
    }
  });
  return ops;
}
