/**
 * Poem mode: concrete-poetry settings of an editable poem, studied from
 * the moodboard —
 * - drift: an italic-serif word cloud with an enveloped (diamond)
 *   silhouette, like the typed "look of wonder" page;
 * - rain: an uppercase typewriter staircase with a parallel number
 *   column and a small mixed-case caption, like "Moet Flowers_";
 * - gaps: a titled measure whose lines open interior whitespace and
 *   whose repeated refrain lines set bold and float free, like the
 *   "All Life Long" page;
 * - constellation: uppercase words pinned around the sheet with accent
 *   points.
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
  const sourceLines = raw.split(/\r?\n/).map((line) => line.trim());
  const words = raw.split(/\s+/).filter((word) => word.length > 0);
  const softInk = mixHex(p.ink, p.paper, 0.42);
  const s = f.u * 0.021 * p.poemScale;
  const lh = s * p.poemLeading;
  const ops: EphemeraOp[] = [];
  if (words.length === 0) return ops;

  if (p.poemArrangement === "drift") {
    // The reference cloud is dense (tight leading), each line holds a
    // few words at independent scattered positions, and the whole block
    // has a soft diamond envelope: narrow at the top and bottom, widest
    // through the middle.
    const usable = f.W - f.m * 2;
    const sd = s * 1.28;
    const rowH = sd * p.poemLeading * 0.56;
    const lineCount = Math.max(3, Math.ceil(words.length / 3));
    const blockHeight = lineCount * rowH;
    let y = Math.max(f.m + sd, f.cy - blockHeight / 2);
    let index = 0;
    let line = 0;
    while (index < words.length && y < f.H - f.m) {
      const envelope =
        0.35 +
        0.65 *
          Math.max(
            0.02,
            Math.sin(Math.PI * Math.min(0.995, (line + 0.5) / lineCount)),
          ) **
            0.7;
      const halfSpan = usable * 0.62 * p.poemSpread * envelope;
      const take = Math.min(2 + Math.floor(rng() * 2.5), words.length - index);
      const offsets: number[] = [];
      for (let k = 0; k < take; k += 1) {
        offsets.push((rng() * 2 - 1) * halfSpan);
      }
      offsets.sort((a, b) => a - b);
      let lastRight = -Infinity;
      for (let k = 0; k < take; k += 1) {
        const word = words[index + k]!;
        const width = estimateWidth(word, sd, "serif");
        let x = f.cx + offsets[k]! - width / 2;
        x = Math.max(x, lastRight + sd * 0.9, f.m);
        x = Math.min(x, f.W - f.m - width);
        lastRight = x + width;
        ops.push(
          text({
            align: "left",
            color: p.ink,
            font: "serif",
            italic: true,
            size: sd,
            text: word,
            weight: 400,
            x,
            y,
          }),
        );
      }
      index += take;
      line += 1;
      y += rowH;
    }
    return ops;
  }

  if (p.poemArrangement === "rain") {
    // A typed staircase: every word its own row, stepping rightward,
    // with a parallel number column that keeps counting a few steps
    // past the last word, and the first line as a small caption below.
    const staircaseWords = words.map((word) => word.toUpperCase());
    const size = s * 0.82;
    const step = size * (1.1 + p.poemSpread * 1.3);
    const rowH = lh * 0.72;
    const rows = Math.min(
      staircaseWords.length,
      Math.floor((f.H - f.m * 2.6) / rowH) - 3,
    );
    const numberRows = Math.min(rows + 3, rows + Math.round(3 + rng() * 2));
    const blockHeight = numberRows * rowH;
    const startY = Math.max(f.m + s, f.cy - blockHeight / 2 - f.u * 0.04);
    const startX = f.m + (f.W - f.m * 2) * 0.22;
    const numberGap = f.u * 0.05 + p.poemSpread * f.u * 0.1;
    for (let row = 0; row < rows; row += 1) {
      const x = Math.min(
        startX + row * step + (rng() - 0.5) * size * 0.6,
        f.W - f.m - numberGap - f.u * 0.14,
      );
      ops.push(
        text({
          align: "left",
          color: p.ink,
          font: "mono",
          size,
          text: staircaseWords[row]!,
          weight: 400,
          x,
          y: startY + row * rowH,
        }),
      );
    }
    // The number column steps on its own diagonal to the right.
    const numberStartX = Math.min(
      startX + f.u * 0.22 + p.poemSpread * f.u * 0.1,
      f.W - f.m - f.u * 0.16,
    );
    for (let row = 0; row < numberRows; row += 1) {
      const x = Math.min(
        numberStartX + row * step * 0.55,
        f.W - f.m - size,
      );
      ops.push(
        text({
          align: "right",
          color: p.accent,
          font: "mono",
          size: size * 0.92,
          text: String(row + 11),
          weight: 400,
          x,
          y: startY + row * rowH,
        }),
      );
    }
    const caption = sourceLines.find((line) => line.length > 0) ?? "";
    if (caption) {
      ops.push(
        text({
          align: "left",
          color: p.ink,
          font: "mono",
          size: size * 0.95,
          text: `${caption.charAt(0)}${caption.slice(1).toLowerCase()}_`,
          weight: 400,
          x: f.m,
          y: Math.min(startY + blockHeight + lh * 1.6, f.H - f.m * 0.7),
        }),
      );
    }
    return ops;
  }

  if (p.poemArrangement === "gaps") {
    // A titled measure: the first line becomes the bold centred title;
    // lines that repeat verbatim become bold refrains floating between
    // the others (alternating centre and right); ordinary lines take a
    // staircase indent and open one interior gap.
    const usable = f.W - f.m * 2;
    const sg = s * 1.12;
    const lhg = sg * p.poemLeading * 0.92;
    const bodyLines = sourceLines.filter(
      (line, index) => index > 0 || line.length > 0,
    );
    const titleLine = bodyLines[0] ?? "";
    const rest = bodyLines.slice(1);
    const counts = new Map<string, number>();
    for (const line of rest) {
      const key = line.toLowerCase();
      if (key.length === 0) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const isRefrain = (line: string) =>
      line.length > 0 &&
      line.split(/\s+/).length <= 4 &&
      (counts.get(line.toLowerCase()) ?? 0) >= 2;

    const blockHeight =
      lhg * 2.4 +
      rest.reduce(
        (height, line) => height + (line.length === 0 ? lhg * 0.55 : lhg),
        0,
      );
    let y = Math.max(f.m + lhg, f.cy - blockHeight / 2);
    if (titleLine) {
      ops.push(
        text({
          align: "center",
          color: p.ink,
          font: "grotesk",
          size: sg * 1.05,
          text: titleLine.toUpperCase(),
          tracking: sg * 0.06,
          weight: 700,
          x: f.cx,
          y,
        }),
      );
      y += lhg * 1.9;
    }
    let refrainIndex = 0;
    for (const line of rest) {
      if (y > f.H - f.m) break;
      if (line.length === 0) {
        y += lhg * 0.55;
        continue;
      }
      if (isRefrain(line)) {
        // Refrains float free of the measure, alternating placement.
        const alignRight = refrainIndex % 2 === 1;
        refrainIndex += 1;
        ops.push(
          text({
            align: alignRight ? "right" : "center",
            color: p.ink,
            font: "serif",
            size: sg,
            text: line,
            weight: 700,
            x: alignRight
              ? f.W - f.m
              : f.cx + (rng() - 0.5) * usable * 0.16,
            y,
          }),
        );
        y += lhg;
        continue;
      }
      const lineWords = line.split(/\s+/);
      const indent = f.m + Math.floor(rng() * 4) * sg * 1.4;
      if (lineWords.length < 4) {
        ops.push(
          text({
            align: "left",
            color: p.ink,
            font: "serif",
            size: sg,
            text: line,
            weight: 400,
            x: indent,
            y,
          }),
        );
        y += lhg;
        continue;
      }
      // One interior gap splits the line into two phrases.
      const cut =
        1 + Math.floor(rng() * (lineWords.length - 2)) || 1;
      const head = lineWords.slice(0, cut).join(" ");
      const tail = lineWords.slice(cut).join(" ");
      const headWidth = estimateWidth(head, sg, "serif");
      const gap =
        sg * 1.6 + rng() * usable * 0.24 * Math.max(0.25, p.poemSpread);
      const tailX = Math.min(
        indent + headWidth + gap,
        f.W - f.m - estimateWidth(tail, sg, "serif"),
      );
      ops.push(
        text({
          align: "left",
          color: p.ink,
          font: "serif",
          size: sg,
          text: head,
          weight: 400,
          x: indent,
          y,
        }),
        text({
          align: "left",
          color: p.ink,
          font: "serif",
          size: sg,
          text: tail,
          weight: 400,
          x: Math.max(tailX, indent + headWidth + sg * 1.2),
          y,
        }),
      );
      y += lhg;
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
        tracking: size * 0.08,
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
