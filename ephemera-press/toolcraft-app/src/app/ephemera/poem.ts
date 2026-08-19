/**
 * Poem mode: concrete-poetry scatters of an editable poem — a drifting
 * word cloud, a rain column with accent line numbers, a gap-justified
 * measure, and an uppercase constellation.
 */

import {
  clampChars,
  estimateWidth,
  frameOf,
  hashString,
  mixHex,
  mulberry32,
  text,
  EPHEMERA_MAX_POEM_CHARS,
  type EphemeraParams,
} from "./core";
import type { EphemeraOp } from "./ops";

export function poemOps(p: EphemeraParams): EphemeraOp[] {
  const f = frameOf(p);
  const rng = mulberry32((p.seed ^ 0x9e3b) + hashString(p.poemArrangement));
  const raw = clampChars(p.poemText, EPHEMERA_MAX_POEM_CHARS);
  const sourceLines = raw
    .split(/\r?\n/)
    .map((line) => line.trim());
  const words = raw.split(/\s+/).filter((word) => word.length > 0);
  const softInk = mixHex(p.ink, p.paper, 0.42);
  const s = f.u * 0.021 * p.poemScale;
  const lh = s * p.poemLeading;
  const ops: EphemeraOp[] = [];
  if (words.length === 0) return ops;

  if (p.poemArrangement === "drift") {
    // A loose cloud of phrases: each line takes a few words and lets
    // them wander sideways, like the typewritten "look of wonder" page.
    const usable = f.W - f.m * 2;
    let index = 0;
    const lineCount = Math.max(1, Math.ceil(words.length / 2.6));
    let y = Math.max(f.m + lh, f.cy - (lineCount / 2) * lh * 0.92);
    while (index < words.length && y < f.H - f.m) {
      const take = Math.min(1 + Math.floor(rng() * 3.4), words.length - index);
      const center = f.cx + (rng() - 0.5) * p.poemSpread * usable * 0.3;
      const offsets: number[] = [];
      for (let k = 0; k < take; k += 1) {
        offsets.push((rng() - 0.5) * p.poemSpread * usable * 0.85);
      }
      offsets.sort((a, b) => a - b);
      let lastRight = -Infinity;
      for (let k = 0; k < take; k += 1) {
        const word = words[index + k]!;
        const width = estimateWidth(word, s, "serif");
        let x = center + offsets[k]! - width / 2;
        x = Math.max(x, lastRight + s * 0.7, f.m);
        x = Math.min(x, f.W - f.m - width);
        lastRight = x + width;
        ops.push(
          text({
            align: "left",
            color: p.ink,
            font: "serif",
            italic: true,
            size: s,
            text: word,
            weight: 400,
            x,
            y,
          }),
        );
      }
      index += take;
      y += lh * (0.72 + rng() * 0.55);
    }
    return ops;
  }

  if (p.poemArrangement === "rain") {
    // One word per line trickling down a wandering column, with small
    // accent line numbers in the right margin like a typing exercise.
    let x = f.cx;
    let y = f.m + lh;
    let row = 0;
    for (const word of words) {
      if (y > f.H - f.m) break;
      x += (rng() - 0.5) * p.poemSpread * f.u * 0.24;
      x = Math.min(Math.max(x, f.m + f.u * 0.12), f.W - f.m - f.u * 0.12);
      ops.push(
        text({
          align: "center",
          color: p.ink,
          font: "mono",
          size: s,
          text: word,
          weight: 400,
          x,
          y,
        }),
      );
      ops.push(
        text({
          align: "right",
          color: p.accent,
          font: "mono",
          size: s * 0.58,
          text: String(row + 1),
          weight: 400,
          x: f.W - f.m,
          y,
        }),
      );
      row += 1;
      y += lh * 0.9;
    }
    return ops;
  }

  if (p.poemArrangement === "gaps") {
    // Keeps the authored line breaks but opens wide interior gaps, the
    // way "All Life Long" scatters its phrases across the measure. The
    // block sits vertically centred on the sheet.
    const usable = f.W - f.m * 2;
    const blockHeight = sourceLines.reduce(
      (height, line) => height + (line.length === 0 ? lh * 0.6 : lh),
      0,
    );
    let y = Math.max(f.m + lh, f.cy - blockHeight / 2);
    for (const line of sourceLines) {
      if (y > f.H - f.m) break;
      if (line.length === 0) {
        y += lh * 0.6;
        continue;
      }
      const lineWords = line.split(/\s+/);
      const chunkCount =
        lineWords.length >= 4 ? 1 + Math.floor(rng() * 2.4) : 1;
      const chunks: string[] = [];
      const per = Math.ceil(lineWords.length / Math.max(1, chunkCount));
      for (let k = 0; k < lineWords.length; k += per) {
        chunks.push(lineWords.slice(k, k + per).join(" "));
      }
      // Chunks never overprint: each one starts past the previous
      // chunk's right edge, and the right-aligned ending is used only
      // when it clears that edge.
      let lastRight = -Infinity;
      chunks.forEach((chunk, chunkIndex) => {
        const width = estimateWidth(chunk, s, "serif");
        if (chunkIndex === 0) {
          lastRight = f.m + width;
          ops.push(
            text({
              align: "left",
              color: p.ink,
              font: "serif",
              size: s,
              text: chunk,
              weight: 400,
              x: f.m,
              y,
            }),
          );
          return;
        }
        if (
          chunkIndex === chunks.length - 1 &&
          rng() < 0.45 &&
          f.W - f.m - width > lastRight + s * 1.2
        ) {
          ops.push(
            text({
              align: "right",
              color: p.ink,
              font: "serif",
              size: s,
              text: chunk,
              weight: 400,
              x: f.W - f.m,
              y,
            }),
          );
          return;
        }
        const wandered =
          f.m + (0.3 + rng() * 0.42) * usable * Math.max(0.25, p.poemSpread);
        const x = Math.max(
          Math.min(wandered, f.W - f.m - width),
          lastRight + s * 1.2,
        );
        lastRight = x + width;
        ops.push(
          text({
            align: "left",
            color: p.ink,
            font: "serif",
            size: s,
            text: chunk,
            weight: 400,
            x,
            y,
          }),
        );
      });
      y += lh;
    }
    return ops;
  }

  // Constellation: uppercase words pinned around the sheet center with
  // small accent points, like a star chart of the poem.
  const placed: { w: number; x: number; y: number }[] = [];
  for (const word of words) {
    const label = word.toUpperCase();
    const size = s * (0.68 + rng() * 0.62);
    const radius =
      Math.sqrt(rng()) * p.poemSpread * 0.52 * Math.min(f.W, f.H) * 0.95;
    const angle = rng() * Math.PI * 2;
    const x = f.cx + Math.cos(angle) * radius * (f.W / f.u) * 0.72;
    const y = f.cy + Math.sin(angle) * radius * (f.H / f.u) * 0.72;
    const width = estimateWidth(label, size, "mono");
    if (
      x - width / 2 < f.m ||
      x + width / 2 > f.W - f.m ||
      y < f.m ||
      y > f.H - f.m
    ) {
      continue;
    }
    // Leading sets the vertical exclusion band between pinned words
    // (lh * 0.9 equals the old s * 1.35 at the default leading).
    const collides = placed.some(
      (prev) =>
        Math.abs(prev.y - y) < lh * 0.9 &&
        Math.abs(prev.x - x) < (prev.w + width) / 2 + s,
    );
    if (collides) continue;
    placed.push({ w: width, x, y });
    ops.push(
      text({
        align: "center",
        color: p.ink,
        font: "mono",
        size,
        text: label,
        weight: 400,
        x,
        y,
      }),
    );
    if (rng() < 0.22) {
      ops.push({
        color: p.accent,
        kind: "dot",
        r: s * 0.13,
        x: x + width / 2 + s * 0.55,
        y,
      });
    }
  }
  if (placed.length > 0) {
    ops.push(
      text({
        align: "right",
        color: softInk,
        font: "mono",
        size: s * 0.6,
        text: `${placed.length} / ${words.length}`,
        weight: 400,
        x: f.W - f.m,
        y: f.H - f.m * 0.6,
      }),
    );
  }
  return ops;
}
