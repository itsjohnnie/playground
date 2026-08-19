/**
 * Sheet mode: repeated-word texture grids — a woven texture, a
 * numbered specimen ledger, and word patches — like the typewritten
 * textile pieces.
 */

import {
  clampChars,
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
  const colW = cell * (p.sheetPattern === "ledger" ? 3.4 : 3.1);
  const cols = Math.max(1, Math.floor((f.W - f.m * 2) / colW));
  const rows = Math.max(1, Math.floor((f.H - f.m * 2) / cell));
  const total = Math.min(cols * rows, EPHEMERA_MAX_SHEET_CELLS);
  const ops: EphemeraOp[] = [];

  if (p.sheetPattern === "weave") {
    const size = cell * 0.44;
    let tokenIndex = 0;
    for (let index = 0; index < total; index += 1) {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const skip = rng() < p.sheetVoid;
      const emphasize = rng() < p.sheetEmphasis;
      const accent = rng() < p.sheetEmphasis * 0.22;
      const jitter = rng();
      if (skip) continue;
      const token = tokens[tokenIndex % tokens.length]!;
      tokenIndex += 1;
      const offset = (row % 2) * (colW / 2);
      ops.push(
        text({
          align: "left",
          color: accent ? p.accent : p.ink,
          font: "mono",
          size,
          text: token,
          weight: emphasize ? 700 : 400,
          x: f.m + col * colW + offset + jitter * cell * 0.18,
          y: f.m + row * cell + cell / 2,
        }),
      );
    }
    return ops;
  }

  if (p.sheetPattern === "ledger") {
    // A numbered specimen chart: every slot keeps its index; the void
    // fraction leaves numbered empty slots like an unfinished ledger.
    const size = cell * 0.4;
    for (let index = 0; index < total; index += 1) {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = f.m + col * colW;
      const y = f.m + row * cell + cell / 2;
      ops.push(
        text({
          align: "left",
          color: p.accent,
          font: "mono",
          size: size * 0.62,
          text: String(index + 1),
          weight: 400,
          x,
          y: y - cell * 0.26,
        }),
      );
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
          x,
          y: y + cell * 0.12,
        }),
      );
    }
    return ops;
  }

  // Patches: rectangular districts, each committed to one word and one
  // density, like the woven word-textiles.
  const patchCols = 2 + Math.floor(rng() * 3);
  const patchRows = 2 + Math.floor(rng() * 4);
  const size = cell * 0.44;
  for (let pr = 0; pr < patchRows; pr += 1) {
    for (let pc = 0; pc < patchCols; pc += 1) {
      const token = tokens[Math.floor(rng() * tokens.length)]!;
      const density = 0.4 + rng() * 0.6;
      const emphasize = rng() < p.sheetEmphasis;
      const accent = emphasize && rng() < 0.35;
      const empty = rng() < p.sheetVoid * 0.85;
      const colStart = Math.floor((pc / patchCols) * cols);
      const colEnd = Math.floor(((pc + 1) / patchCols) * cols);
      const rowStart = Math.floor((pr / patchRows) * rows);
      const rowEnd = Math.floor(((pr + 1) / patchRows) * rows);
      for (let row = rowStart; row < rowEnd; row += 1) {
        for (let col = colStart; col < colEnd; col += 1) {
          const keep = rng() < density;
          if (empty || !keep) continue;
          if (row * cols + col >= EPHEMERA_MAX_SHEET_CELLS) continue;
          ops.push(
            text({
              align: "left",
              color: accent ? p.accent : p.ink,
              font: "mono",
              size,
              text: token,
              weight: emphasize ? 700 : 400,
              x: f.m + col * colW + (row % 2) * (colW / 2),
              y: f.m + row * cell + cell / 2,
            }),
          );
        }
      }
    }
  }
  return ops;
}
