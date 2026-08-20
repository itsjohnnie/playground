/**
 * Tour mode: minimal concert bills studied from the moodboard —
 * - diagonal: serif city/venue blocks stepping from upper-left to
 *   lower-right along a thin rule, dates across the rule, the artist
 *   letterspaced lowercase in the corner (the first Solange poster);
 * - orbit: one large thin circle with a vertical rule and a central
 *   date column, show blocks alternating left and right of it, running
 *   on below the circle (the second Solange poster);
 * - ledger: centred date/city/venue blocks in the second ink wandering
 *   down the sheet under a tracked headline, with underlined region
 *   headers (the Kali Malone itinerary).
 *
 * Itinerary lines with a single field ("North America") become region
 * headers; full lines are "date  city  venue".
 */

import {
  clampChars,
  estimateWidth,
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

type TourEntry = Readonly<{
  city: string;
  date: string;
  header?: string;
  venue: string;
}>;

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
      if (parts.length === 1) {
        return { city: "", date: "", header: parts[0]!, venue: "" };
      }
      return {
        city: parts[1] ?? "",
        date: parts[0] ?? "",
        venue: parts[2] ?? "",
      };
    });
}

/** "Solange" set lowercase with wide letterspacing, serif. */
function letterspacedArtist(
  artist: string,
  x: number,
  y: number,
  size: number,
  color: string,
): ReturnType<typeof text> {
  const lower = artist.charAt(0).toUpperCase() + artist.slice(1).toLowerCase();
  return text({
    align: "left",
    color,
    font: "serif",
    size,
    text: lower,
    tracking: size * 0.55,
    weight: 400,
    x,
    y,
  });
}

export function tourOps(p: EphemeraParams): EphemeraOp[] {
  const f = frameOf(p);
  const rng = mulberry32((p.seed ^ 0x70a2) + hashString(p.tourLayout));
  const parsed = parseTourDates(p.tourDates);
  const shows = parsed.filter((entry) => !entry.header);
  const artist = clampChars(p.tourArtist, EPHEMERA_MAX_WORDS_CHARS) || "SOLSTICE";
  const softInk = mixHex(p.ink, p.paper, 0.35);
  const base = f.u * 0.015;
  const ops: EphemeraOp[] = [];
  if (shows.length === 0) {
    ops.push(letterspacedArtist(artist, f.m, f.m, f.u * 0.018, p.ink));
    return ops;
  }
  const n = shows.length;

  if (p.tourLayout === "diagonal") {
    ops.push(
      letterspacedArtist(artist, f.W * 0.085, f.H * 0.1, f.u * 0.021, p.ink),
    );
    // The bill occupies the lower-right half of the poster, leaving the
    // top as open paper, like the reference.
    const yTop = f.H * 0.36;
    const yBottom = f.H - f.m * 1.2;
    const rowH = Math.min(
      base * 3.0 * p.tourLeading,
      (yBottom - yTop) / Math.max(1, n - 1),
    );
    const usableW = f.W - f.m * 2;
    const xStart = f.m + usableW * 0.3;
    const xEnd = xStart + usableW * 0.36;
    shows.forEach((entry, index) => {
      const t = n === 1 ? 0 : index / (n - 1);
      const y = yTop + t * rowH * (n - 1);
      const x = xStart + t * (xEnd - xStart) + (rng() - 0.5) * base * 0.5;
      ops.push(
        text({
          align: "right",
          color: p.ink,
          font: "serif",
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
            font: "serif",
            size: base * 0.88,
            text: `at ${entry.venue}`,
            weight: 400,
            x: x - base * 0.4,
            y: y + base * 1.35,
          }),
        );
      }
      ops.push(
        text({
          align: "left",
          color: p.ink,
          font: "serif",
          size: base * 0.95,
          text: entry.date,
          weight: 400,
          x: x + base * 2.6,
          y,
        }),
      );
    });
    // The rule runs on past both ends of the list into open paper.
    ops.push({
      color: softInk,
      kind: "line",
      width: Math.max(0.6, f.u * 0.0007),
      x1: xStart + base * 1.5 - usableW * 0.05,
      x2: xEnd + base * 1.5 + usableW * 0.045,
      y1: yTop - f.u * 0.085,
      y2: yBottom + f.u * 0.075,
    });
    return ops;
  }

  if (p.tourLayout === "orbit") {
    // One large thin circle; a central date column runs down a vertical
    // rule through it and continues below; show blocks alternate sides.
    const R = f.u * 0.295;
    const cx = f.cx + f.u * 0.04;
    const cy = f.m + R + f.u * 0.045;
    const ruleX = cx + f.u * 0.055;
    ops.push({
      color: p.ink,
      kind: "circle",
      r: R,
      width: Math.max(0.6, f.u * 0.0008),
      x: cx,
      y: cy,
    });
    const yTop = cy - R + f.u * 0.03;
    const yBottom = f.H - f.m * 1.1;
    const rowH = Math.min(
      base * 5.4 * p.tourLeading,
      (yBottom - yTop) / Math.max(1, n - 1),
    );
    ops.push({
      color: softInk,
      kind: "line",
      width: Math.max(0.6, f.u * 0.0007),
      x1: ruleX,
      x2: ruleX,
      y1: yTop - f.u * 0.02,
      y2: yTop + rowH * (n - 1) + f.u * 0.03,
    });
    shows.forEach((entry, index) => {
      const y = yTop + index * rowH + (rng() - 0.5) * base * 0.4;
      const rightSide = index % 2 === 1;
      ops.push(
        text({
          align: "right",
          color: p.ink,
          font: "serif",
          size: base * 0.92,
          text: entry.date,
          weight: 400,
          x: ruleX - base * 0.9,
          y,
        }),
      );
      const blockX = rightSide ? ruleX + base * 2.2 : ruleX - base * 5.2;
      const align = rightSide ? "left" : "right";
      ops.push(
        text({
          align,
          color: p.ink,
          font: "serif",
          size: base,
          text: entry.city,
          weight: 400,
          x: blockX,
          y,
        }),
      );
      if (entry.venue) {
        ops.push(
          text({
            align,
            color: p.ink,
            font: "serif",
            size: base * 0.88,
            text: `at ${entry.venue}`,
            weight: 400,
            x: blockX,
            y: y + base * 1.3,
          }),
        );
      }
    });
    ops.push(
      letterspacedArtist(
        artist,
        f.m * 0.55,
        cy + R * 0.98,
        f.u * 0.019,
        p.ink,
      ),
    );
    return ops;
  }

  // Ledger: a wandering column of centred second-ink blocks under a
  // tracked headline; region headers set small with an underline.
  ops.push(
    text({
      align: "center",
      color: p.ink,
      font: "grotesk",
      size: f.u * 0.016,
      text: artist.toUpperCase(),
      tracking: f.u * 0.006,
      weight: 400,
      x: f.cx,
      y: f.m * 0.8,
    }),
  );
  const top = f.m * 1.9;
  const rows = parsed.length;
  const rowH = Math.min(
    base * 3.6 * p.tourLeading,
    (f.H - top - f.m * 0.8) / Math.max(1, rows),
  );
  let walk = 0;
  let y = top;
  for (const entry of parsed) {
    walk = Math.max(
      -0.33,
      Math.min(0.33, walk + (rng() - 0.5) * 0.34),
    );
    const xc = f.cx + walk * (f.W - f.m * 2);
    if (entry.header) {
      const label = entry.header;
      const width = estimateWidth(label, base * 0.95, "serif");
      ops.push(
        text({
          align: "center",
          color: p.accent,
          font: "serif",
          size: base * 0.95,
          text: label,
          weight: 400,
          x: xc,
          y: y + rowH * 0.3,
        }),
        {
          color: p.accent,
          kind: "line",
          width: Math.max(0.6, f.u * 0.0007),
          x1: xc - width * 0.62,
          x2: xc + width * 0.62,
          y1: y + rowH * 0.3 + base * 0.85,
          y2: y + rowH * 0.3 + base * 0.85,
        },
      );
      y += rowH * 0.9;
      continue;
    }
    ops.push(
      text({
        align: "center",
        color: p.accent,
        font: "serif",
        size: base * 0.82,
        text: entry.date,
        weight: 400,
        x: xc,
        y,
      }),
      text({
        align: "center",
        color: p.accent,
        font: "serif",
        size: base * 1.05,
        text: entry.city,
        weight: 700,
        x: xc,
        y: y + base * 1.25,
      }),
    );
    if (entry.venue) {
      ops.push(
        text({
          align: "center",
          color: p.accent,
          font: "serif",
          size: base * 0.92,
          text: entry.venue,
          weight: 400,
          x: xc,
          y: y + base * 2.5,
        }),
      );
    }
    y += rowH * (0.78 + rng() * 0.48);
  }
  ops.push(
    text({
      align: "right",
      color: softInk,
      font: "serif",
      size: base * 0.8,
      text: `№ ${p.seed}`,
      weight: 400,
      x: f.W - f.m * 0.6,
      y: f.H - f.m * 0.5,
    }),
  );
  return ops;
}
