import type { ToolcraftState } from "@/toolcraft/runtime";

import type {
  EphemeraMode,
  EphemeraParams,
  PoemArrangement,
  RingStyle,
  SheetPattern,
  TourLayout,
  WheelInstrument,
} from "./engine";

/** Runtime value targets owned by the Ephemera Press product. */
export const EPHEMERA_TARGETS = {
  accent: "ink.accent",
  background: "appearance.background",
  imageFormat: "export.image.format",
  imageResolution: "export.image.resolution",
  includeBackground: "export.includeBackground",
  ink: "ink.primary",
  mode: "piece.mode",
  poemArrangement: "poem.arrangement",
  poemLeading: "poem.leading",
  poemScale: "poem.scale",
  poemSpread: "poem.spread",
  poemText: "poem.text",
  ringCount: "rings.count",
  ringGather: "rings.gather",
  ringMarks: "rings.marks",
  ringSize: "rings.size",
  ringStyle: "rings.style",
  ringWords: "rings.words",
  seed: "piece.seed",
  sheetCell: "sheet.cell",
  sheetEmphasis: "sheet.emphasis",
  sheetPattern: "sheet.pattern",
  sheetVoid: "sheet.void",
  sheetWords: "sheet.words",
  tourArtist: "tour.artist",
  tourDates: "tour.dates",
  tourLayout: "tour.layout",
  tourLeading: "tour.leading",
  wheelDivisions: "wheel.divisions",
  wheelInstrument: "wheel.instrument",
  wheelNotches: "wheel.notches",
  wheelRings: "wheel.rings",
} as const;

const DEFAULT_POEM = [
  "last night I saw the harbour",
  "turn its lamps on one by one,",
  "and every window held",
  "a small and patient sea.",
  "I stood there counting waves",
  "until the counting was the wave,",
  "and what I meant to keep",
  "kept me instead.",
].join("\n");

const DEFAULT_DATES = [
  "6/1  Barcelona, Spain  Primavera",
  "6/10  Paris, France  We Love Green",
  "6/23  Oslo, Norway  Piknik i Parken",
  "6/24  Pilton, UK  Worthy Farm",
  "6/28  Gdynia, Poland  Open'er",
  "6/29  Roskilde, Denmark  Roskilde",
  "7/07  Trencin, Slovakia  Pohoda",
  "7/08  Rotterdam, Netherlands  North Sea Jazz",
  "7/09  Belfort, France  Eurockeennes",
  "7/11  Montreux, Switzerland  Stravinski Hall",
  "7/13  Dour, Belgium  Dour Festival",
  "7/14  London, UK  Lovebox",
].join("\n");

export const EPHEMERA_DEFAULTS = {
  accent: "#c2401f",
  background: "#f4f0e6",
  ink: "#231f1c",
  mode: "poem" as EphemeraMode,
  poemArrangement: "drift" as PoemArrangement,
  poemLeading: 1.5,
  poemScale: 1,
  poemSpread: 0.55,
  poemText: DEFAULT_POEM,
  ringCount: 4,
  ringGather: 0.5,
  ringMarks: true,
  ringSize: 0.55,
  ringStyle: "typewriter" as RingStyle,
  ringWords: "GO AND NOTICE THE MOTION",
  seed: 7,
  sheetCell: 22,
  sheetEmphasis: 0.35,
  sheetPattern: "weave" as SheetPattern,
  sheetVoid: 0.25,
  sheetWords: "SHAPING THE FUTURE",
  tourArtist: "SOLSTICE",
  tourDates: DEFAULT_DATES,
  tourLayout: "diagonal" as TourLayout,
  tourLeading: 1.15,
  wheelDivisions: 36,
  wheelInstrument: "gauge" as WheelInstrument,
  wheelNotches: true,
  wheelRings: 3,
} as const;

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readOption<Option extends string>(
  value: unknown,
  options: readonly Option[],
  fallback: Option,
): Option {
  return typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as Option)
    : fallback;
}

export function readEphemeraMode(
  values: Readonly<Record<string, unknown>>,
): EphemeraMode {
  return readOption(
    values[EPHEMERA_TARGETS.mode],
    ["poem", "rings", "tour", "sheet", "wheel"] as const,
    EPHEMERA_DEFAULTS.mode,
  );
}

export function readEphemeraBackground(
  values: Readonly<Record<string, unknown>>,
): string {
  const value = values[EPHEMERA_TARGETS.background];
  return typeof value === "string" && value.length > 0
    ? value
    : EPHEMERA_DEFAULTS.background;
}

export function readEphemeraInk(
  values: Readonly<Record<string, unknown>>,
): string {
  const value = values[EPHEMERA_TARGETS.ink];
  return typeof value === "string" && value.length > 0
    ? value
    : EPHEMERA_DEFAULTS.ink;
}

export function readEphemeraAccent(
  values: Readonly<Record<string, unknown>>,
): string {
  const value = values[EPHEMERA_TARGETS.accent];
  return typeof value === "string" && value.length > 0
    ? value
    : EPHEMERA_DEFAULTS.accent;
}

/** Maps runtime values plus a scene size onto the engine parameter set. */
export function readEphemeraParams(
  values: Readonly<Record<string, unknown>>,
  W: number,
  H: number,
): EphemeraParams {
  const d = EPHEMERA_DEFAULTS;
  const t = EPHEMERA_TARGETS;
  return {
    H,
    W,
    accent: readEphemeraAccent(values),
    ink: readEphemeraInk(values),
    mode: readEphemeraMode(values),
    paper: readEphemeraBackground(values),
    poemArrangement: readOption(
      values[t.poemArrangement],
      ["drift", "rain", "gaps", "constellation"] as const,
      d.poemArrangement,
    ),
    poemLeading: readNumber(values[t.poemLeading], d.poemLeading),
    poemScale: readNumber(values[t.poemScale], d.poemScale),
    poemSpread: readNumber(values[t.poemSpread], d.poemSpread),
    poemText: readString(values[t.poemText], d.poemText),
    ringCount: readNumber(values[t.ringCount], d.ringCount),
    ringGather: readNumber(values[t.ringGather], d.ringGather),
    ringMarks: readBoolean(values[t.ringMarks], d.ringMarks),
    ringSize: readNumber(values[t.ringSize], d.ringSize),
    ringStyle: readOption(
      values[t.ringStyle],
      ["typewriter", "stitched", "orbits"] as const,
      d.ringStyle,
    ),
    ringWords: readString(values[t.ringWords], d.ringWords),
    seed: Math.round(readNumber(values[t.seed], d.seed)) | 0,
    sheetCell: readNumber(values[t.sheetCell], d.sheetCell),
    sheetEmphasis: readNumber(values[t.sheetEmphasis], d.sheetEmphasis),
    sheetPattern: readOption(
      values[t.sheetPattern],
      ["weave", "ledger", "patches"] as const,
      d.sheetPattern,
    ),
    sheetVoid: readNumber(values[t.sheetVoid], d.sheetVoid),
    sheetWords: readString(values[t.sheetWords], d.sheetWords),
    tourArtist: readString(values[t.tourArtist], d.tourArtist),
    tourDates: readString(values[t.tourDates], d.tourDates),
    tourLayout: readOption(
      values[t.tourLayout],
      ["diagonal", "orbit", "ledger"] as const,
      d.tourLayout,
    ),
    tourLeading: readNumber(values[t.tourLeading], d.tourLeading),
    wheelDivisions: readNumber(values[t.wheelDivisions], d.wheelDivisions),
    wheelInstrument: readOption(
      values[t.wheelInstrument],
      ["gauge", "knitting", "dose", "dial"] as const,
      d.wheelInstrument,
    ),
    wheelNotches: readBoolean(values[t.wheelNotches], d.wheelNotches),
    wheelRings: readNumber(values[t.wheelRings], d.wheelRings),
  };
}

/**
 * Infinite-mode product scene: one fixed portrait sheet matching the
 * default 1080x1350 artboard, centred on the world origin. The sheet
 * proportion is part of the product identity, so the rect is constant.
 */
export const EPHEMERA_SHEET_WIDTH = 1080;
export const EPHEMERA_SHEET_HEIGHT = 1350;

export function getEphemeraSceneRect(_state: Readonly<ToolcraftState>): {
  height: number;
  width: number;
  x: number;
  y: number;
} {
  return {
    height: EPHEMERA_SHEET_HEIGHT,
    width: EPHEMERA_SHEET_WIDTH,
    x: -EPHEMERA_SHEET_WIDTH / 2,
    y: -EPHEMERA_SHEET_HEIGHT / 2,
  };
}
