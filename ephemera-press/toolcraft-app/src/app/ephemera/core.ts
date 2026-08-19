/**
 * Shared foundation for the Ephemera Press generators: the parameter
 * set, seeded randomness, color mixing, the sheet frame, and text
 * helpers. Every family module builds on these so the whole engine
 * stays a pure, Node-testable function of committed state.
 */

import {
  EPHEMERA_CHAR_WIDTH,
  type EphemeraFont,
  type EphemeraTextOp,
} from "./ops";

export type EphemeraMode = "poem" | "rings" | "sheet" | "tour" | "wheel";

export type PoemArrangement = "constellation" | "drift" | "gaps" | "rain";
export type RingStyle = "orbits" | "stitched" | "typewriter";
export type TourLayout = "diagonal" | "ledger" | "orbit";
export type SheetPattern = "ledger" | "patches" | "weave";
export type WheelInstrument = "dial" | "dose" | "gauge" | "knitting";

export type EphemeraParams = Readonly<{
  H: number;
  W: number;
  accent: string;
  ink: string;
  mode: EphemeraMode;
  paper: string;
  poemArrangement: PoemArrangement;
  poemLeading: number;
  poemScale: number;
  poemSpread: number;
  poemText: string;
  ringCount: number;
  ringGather: number;
  ringMarks: boolean;
  ringSize: number;
  ringStyle: RingStyle;
  ringWords: string;
  seed: number;
  sheetCell: number;
  sheetEmphasis: number;
  sheetPattern: SheetPattern;
  sheetVoid: number;
  sheetWords: string;
  tourArtist: string;
  tourDates: string;
  tourLayout: TourLayout;
  tourLeading: number;
  wheelDivisions: number;
  wheelInstrument: WheelInstrument;
  wheelNotches: boolean;
  wheelRings: number;
}>;

/** Enforced input boundaries so user text never scales work unbounded. */
export const EPHEMERA_MAX_POEM_CHARS = 1600;
export const EPHEMERA_MAX_TOUR_LINES = 36;
export const EPHEMERA_MAX_WORDS_CHARS = 120;
export const EPHEMERA_MAX_SHEET_CELLS = 20000;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value: string): number {
  let h = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    h ^= value.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function clampChars(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

export function estimateWidth(
  text: string,
  size: number,
  font: EphemeraFont,
): number {
  return text.length * size * EPHEMERA_CHAR_WIDTH[font];
}

/** Mixes two hex colors; t=0 keeps a, t=1 keeps b. */
export function mixHex(a: string, b: string, t: number): string {
  const parse = (hex: string): [number, number, number] => {
    const clean = hex.replace("#", "");
    const full =
      clean.length === 3
        ? clean
            .split("")
            .map((c) => c + c)
            .join("")
        : clean.padEnd(6, "0");
    return [
      parseInt(full.slice(0, 2), 16) || 0,
      parseInt(full.slice(2, 4), 16) || 0,
      parseInt(full.slice(4, 6), 16) || 0,
    ];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const channel = (x: number, y: number) =>
    Math.round(x + (y - x) * Math.min(1, Math.max(0, t)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(ar, br)}${channel(ag, bg)}${channel(ab, bb)}`;
}

export type Frame = Readonly<{
  H: number;
  W: number;
  cx: number;
  cy: number;
  m: number;
  u: number;
}>;

export function frameOf(p: EphemeraParams): Frame {
  const u = Math.min(p.W, p.H);
  return { H: p.H, W: p.W, cx: p.W / 2, cy: p.H / 2, m: u * 0.09, u };
}

export function text(op: Omit<EphemeraTextOp, "kind">): EphemeraTextOp {
  return { kind: "text", ...op };
}
