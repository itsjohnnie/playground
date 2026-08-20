/**
 * Sheet mode: repeated-word textures studied from the moodboard —
 * - weave: horizontal bands that each repeat one word in tight offset
 *   rows, with a rotated selvedge column running up the right margin,
 *   like the woven SHAPING/THE/FUTURE swatch;
 * - ledger: a numbered specimen chart whose section heads carry circled
 *   numbers, like the dream-dictionary card;
 * - patches: rectangular districts each committed to one word, one
 *   density, and a slight fabric tilt.
 */

import {
  clampChars,
  estimateWidth,
  frameOf,
  hashString,
  mixHex,
  mulberry32,
  text,
  EPHEMERA_MAX_SHEET_CELLS,
  EPHEMERA_MAX_WORDS_CHARS,
  type EphemeraParams,
} from "./core";
import type { EphemeraOp } from "./ops";

function sheetTokens(p: EphemeraParams): string[] {
  const tokens = clampChars(p.sheetWords, EPHEMERA_MAX_WORDS_CHARS)
    .split(/\s+/)
    .filter((token) => token.length > 0);
  return tokens.length > 0 ? tokens : ["EPHEMERA"];
}

export function sheetOps(p: EphemeraParams): EphemeraOp[] {
  const f = frameOf(p);
  const rng = mulberry32((p.seed ^ 0x3c11) + hashString(p.sheetPattern));
  const tokens = sheetTokens(p);
  const softInk = mixHex(p.ink, p.paper, 0.48);
  const cell = Math.max(6, p.sheetCell);
  const ops: EphemeraOp[] = [];
  let budget = EPHEMERA_MAX_SHEET_CELLS;

  if (p.sheetPattern === "weave") {
    // Bands, one per token, cycled to fill the swatch height. Rows
    // repeat the band's word edge to edge with alternate half-steps;
    // void frays the rows, emphasis bolds whole rows.
    const size = cell * 0.46;
    const inset = f.m * 1.15;
    const top = inset;
    const bottom = f.H - inset;
    const left = inset;
    const right = f.W - inset - cell * 1.6; // room for the selvedge
    const rows = Math.max(1, Math.floor((bottom - top) / cell));
    const bandCount = tokens.length;
    let row = 0;
    while (row < rows && budget > 0) {
      const band = Math.min(
        bandCount - 1,
        Math.floor((row / rows) * bandCount),
      );
      const token = tokens[band]!;
      const colW = estimateWidth(token, size, "mono") + size * 0.55;
      const cols = Math.max(1, Math.floor((right - left) / colW));
      const boldRow = rng() < p.sheetEmphasis;
      const offset = (row % 2) * (colW / 2);
      for (let col = 0; col < cols && budget > 0; col += 1) {
        const frayed =
          rng() < p.sheetVoid * (col === 0 || col === cols - 1 ? 1.6 : 0.85);
        const accent = rng() < p.sheetEmphasis * 0.05;
        const jitter = (rng() - 0.5) * size * 0.3;
        if (frayed) continue;
        budget -= 1;
        ops.push(
          text({
            align: "left",
            color: accent ? p.accent : p.ink,
            font: "mono",
            size,
            text: token,
            weight: boldRow ? 700 : 400,
            x: left + col * colW + offset + jitter,
            y: top + row * cell + cell / 2,
          }),
        );
      }
      row += 1;
    }
    // The selvedge: tokens rotated to read up the right margin.
    const selvedgeX = f.W - inset + cell * 0.2;
    let sy = bottom;
    let selvedgeIndex = 0;
    while (sy > top && budget > 0) {
      const token = tokens[selvedgeIndex % tokens.length]!;
      selvedgeIndex += 1;
      const width = estimateWidth(token, size * 0.9, "mono");
      if (rng() < p.sheetVoid * 0.6) {
        sy -= width + size;
        continue;
      }
      budget -= 1;
      ops.push(
        text({
          align: "left",
          angle: -Math.PI / 2,
          color: softInk,
          font: "mono",
          size: size * 0.9,
          text: token,
          weight: 400,
          x: selvedgeX,
          y: sy,
        }),
      );
      sy -= width + size;
    }
    return ops;
  }

  if (p.sheetPattern === "ledger") {
    // A numbered specimen chart: every slot keeps its index; every
    // sixth slot is a section head with a circled number; the void
    // fraction leaves numbered empty slots like an unfinished ledger.
    const size = cell * 0.4;
    const colW = cell * 3.4;
    const cols = Math.max(1, Math.floor((f.W - f.m * 2) / colW));
    const rows = Math.max(1, Math.floor((f.H - f.m * 2) / cell));
    const total = Math.min(cols * rows, EPHEMERA_MAX_SHEET_CELLS);
    for (let index = 0; index < total; index += 1) {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = f.m + col * colW;
      const y = f.m + row * cell + cell / 2;
      const sectionHead = index % 6 === 0;
      if (sectionHead) {
        ops.push(
          {
            color: p.accent,
            kind: "circle",
            r: size * 0.72,
            width: Math.max(0.6, size * 0.07),
            x: x + size * 0.62,
            y: y - cell * 0.18,
          },
          text({
            align: "center",
            color: p.accent,
            font: "mono",
            size: size * 0.6,
            text: String(index + 1),
            weight: 400,
            x: x + size * 0.62,
            y: y - cell * 0.18,
          }),
        );
      } else {
        // Inline entry number, like "2  HURT" in the reference chart.
        ops.push(
          text({
            align: "left",
            color: p.accent,
            font: "mono",
            size: size * 0.62,
            text: String(index + 1),
            weight: 400,
            x,
            y,
          }),
        );
      }
      if (rng() < p.sheetVoid) continue;
      const emphasize = rng() < p.sheetEmphasis;
      ops.push(
        text({
          align: "left",
          color: emphasize ? p.ink : softInk,
          font: "mono",
          size,
          text: tokens[index % tokens.length]!,
          weight: emphasize ? 700 : 400,
          x: x + size * (sectionHead ? 1.7 : 1.3),
          y,
        }),
      );
    }
    return ops;
  }

  // Patches: rectangular districts, each committed to one word, one
  // density, and one slight tilt, like scattered fabric swatches.
  const patchCols = 2 + Math.floor(rng() * 3);
  const patchRows = 2 + Math.floor(rng() * 4);
  const size = cell * 0.44;
  const colWBase = cell * 3.1;
  const cols = Math.max(1, Math.floor((f.W - f.m * 2) / colWBase));
  const rows = Math.max(1, Math.floor((f.H - f.m * 2) / cell));
  for (let pr = 0; pr < patchRows; pr += 1) {
    for (let pc = 0; pc < patchCols; pc += 1) {
      const token = tokens[Math.floor(rng() * tokens.length)]!;
      const density = 0.4 + rng() * 0.6;
      const emphasize = rng() < p.sheetEmphasis;
      const accent = emphasize && rng() < 0.35;
      const empty = rng() < p.sheetVoid * 0.85;
      const tilt = (rng() - 0.5) * 0.09;
      const colStart = Math.floor((pc / patchCols) * cols);
      const colEnd = Math.floor(((pc + 1) / patchCols) * cols);
      const rowStart = Math.floor((pr / patchRows) * rows);
      const rowEnd = Math.floor(((pr + 1) / patchRows) * rows);
      for (let row = rowStart; row < rowEnd; row += 1) {
        for (let col = colStart; col < colEnd; col += 1) {
          const keep = rng() < density;
          if (empty || !keep) continue;
          if (budget <= 0) continue;
          budget -= 1;
          ops.push(
            text({
              align: "left",
              angle: tilt,
              color: accent ? p.accent : p.ink,
              font: "mono",
              size,
              text: token,
              weight: emphasize ? 700 : 400,
              x: f.m + col * colWBase + (row % 2) * (colWBase / 2),
              y: f.m + row * cell + cell / 2,
            }),
          );
        }
      }
    }
  }
  return ops;
}
