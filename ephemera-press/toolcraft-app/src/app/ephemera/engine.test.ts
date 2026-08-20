import { describe, expect, it } from "vitest";

import {
  computePiece,
  parseTourDates,
  EPHEMERA_MAX_POEM_CHARS,
  EPHEMERA_MAX_TOUR_LINES,
  type EphemeraMode,
  type EphemeraParams,
  type RingStyle,
} from "./engine";
import type { EphemeraModel, EphemeraTextOp } from "./ops";
import { EPHEMERA_DEFAULTS, readEphemeraParams } from "./params";

const d = EPHEMERA_DEFAULTS;

const ALL_MODES: readonly EphemeraMode[] = [
  "poem",
  "rings",
  "tour",
  "sheet",
  "wheel",
];
const ALL_RING_STYLES: readonly RingStyle[] = [
  "typewriter",
  "stitched",
  "orbits",
];

function piece(overrides: Partial<EphemeraParams> = {}): EphemeraModel {
  return computePiece({ ...readEphemeraParams({}, 1080, 1350), ...overrides });
}

function signature(model: EphemeraModel): string {
  return JSON.stringify(model.ops);
}

function textOps(model: EphemeraModel): EphemeraTextOp[] {
  return model.ops.filter((op): op is EphemeraTextOp => op.kind === "text");
}

function textStrings(model: EphemeraModel): string[] {
  return textOps(model).map((op) => op.text);
}

function opsWithColor(model: EphemeraModel, color: string): number {
  return model.ops.filter((op) => "color" in op && op.color === color).length;
}

describe("ephemera engine", () => {
  it("piece mode switches generators deterministically in every mode", () => {
    const signatures = new Set<string>();
    for (const mode of ALL_MODES) {
      const first = piece({ mode });
      const second = piece({ mode });
      expect(first.ops.length).toBeGreaterThan(0);
      expect(signature(first)).toBe(signature(second));
      signatures.add(signature(first));
    }
    expect(signatures.size).toBe(ALL_MODES.length);
  });

  it("seed recomposes each piece deterministically per seed", () => {
    for (const mode of ALL_MODES) {
      const seed7 = piece({ mode, seed: 7 });
      const seed7Again = piece({ mode, seed: 7 });
      const seed8 = piece({ mode, seed: 8 });
      expect(signature(seed7)).toBe(signature(seed7Again));
      expect(signature(seed7)).not.toBe(signature(seed8));
    }
  });

  it("ink color paints the primary text and marks", () => {
    for (const mode of ALL_MODES) {
      const inked = piece({ ink: "#112233", mode });
      expect(opsWithColor(inked, "#112233")).toBeGreaterThan(0);
      expect(signature(inked)).not.toBe(signature(piece({ mode })));
    }
  });

  it("accent color paints dates, numbers, and stitches", () => {
    const cases: Partial<EphemeraParams>[] = [
      { mode: "poem", poemArrangement: "rain" },
      { mode: "rings", ringMarks: true },
      { mode: "tour", tourLayout: "ledger" },
      { mode: "sheet", sheetPattern: "ledger" },
      { mode: "wheel", wheelInstrument: "knitting" },
    ];
    for (const overrides of cases) {
      const accented = piece({ ...overrides, accent: "#00aa88" });
      expect(opsWithColor(accented, "#00aa88")).toBeGreaterThan(0);
    }
  });

  it("poem text lays out the typed words and clamps long input", () => {
    const custom = piece({ poemText: "quiet harbour lanterns" });
    expect(textStrings(custom)).toEqual(
      expect.arrayContaining(["quiet", "harbour", "lanterns"]),
    );
    const longText = "wave ".repeat(2000);
    const clamped = piece({ poemText: longText });
    const clampedManually = piece({
      poemText: longText.slice(0, EPHEMERA_MAX_POEM_CHARS),
    });
    expect(signature(clamped)).toBe(signature(clampedManually));
  });

  it("every poem arrangement composes a distinct scatter", () => {
    const signatures = new Set(
      (["drift", "rain", "gaps", "constellation"] as const).map((arrangement) =>
        signature(piece({ poemArrangement: arrangement })),
      ),
    );
    expect(signatures.size).toBe(4);
  });

  it("poem spread widens how far words wander", () => {
    const xRange = (spread: number): number => {
      const xs = textOps(piece({ poemArrangement: "drift", poemSpread: spread }))
        .map((op) => op.x);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(xRange(1)).toBeGreaterThan(xRange(0));
  });

  it("poem leading respaces the lines", () => {
    const maxY = (leading: number): number =>
      Math.max(
        ...textOps(
          piece({ poemArrangement: "gaps", poemLeading: leading }),
        ).map((op) => op.y),
      );
    expect(maxY(2.2)).toBeGreaterThan(maxY(1));
  });

  it("poem type size rescales the set words", () => {
    const firstSize = (scale: number): number =>
      textOps(piece({ poemArrangement: "gaps", poemScale: scale }))[0]!.size;
    expect(firstSize(1.5)).toBeGreaterThan(firstSize(0.75));
  });

  it("every ring style composes a distinct ring set", () => {
    const signatures = new Set(
      ALL_RING_STYLES.map((style) =>
        signature(piece({ mode: "rings", ringStyle: style })),
      ),
    );
    expect(signatures.size).toBe(ALL_RING_STYLES.length);
    // Stitched circles are sewn from short thread segments.
    const stitched = piece({ mode: "rings", ringStyle: "stitched" });
    expect(stitched.ops.some((op) => op.kind === "line")).toBe(true);
    const orbits = piece({ mode: "rings", ringStyle: "orbits" });
    expect(orbits.ops.some((op) => op.kind === "dot")).toBe(true);
  });

  it("ring words repeat around each typewriter ring", () => {
    const model = piece({
      mode: "rings",
      ringStyle: "typewriter",
      ringWords: "XQZ",
    });
    const characters = new Set(textStrings(model));
    expect(characters.has("X")).toBe(true);
    expect(characters.has("Q")).toBe(true);
    expect(characters.has("Z")).toBe(true);
  });

  it("ring count adds and removes rings", () => {
    const two = piece({ mode: "rings", ringCount: 2 });
    const eight = piece({ mode: "rings", ringCount: 8 });
    expect(eight.ops.length).toBeGreaterThan(two.ops.length);
  });

  it("ring size rescales the ring set", () => {
    const small = piece({ mode: "rings", ringSize: 0.3, ringStyle: "stitched" });
    const large = piece({ mode: "rings", ringSize: 0.9, ringStyle: "stitched" });
    const stitchSpanX = (model: EphemeraModel): number => {
      const xs = model.ops.flatMap((op) =>
        op.kind === "line" ? [op.x1, op.x2] : [],
      );
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(stitchSpanX(large)).toBeGreaterThan(stitchSpanX(small));
  });

  it("ring gather pulls rings into one another", () => {
    const loose = piece({ mode: "rings", ringGather: 0, ringStyle: "stitched" });
    const knotted = piece({
      mode: "rings",
      ringGather: 1,
      ringStyle: "stitched",
    });
    // Circle centres approximated by averaging each thread's extent.
    const stitchSpanX = (model: EphemeraModel): number => {
      const xs = model.ops.flatMap((op) =>
        op.kind === "line" ? [op.x1, op.x2] : [],
      );
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(stitchSpanX(loose)).toBeGreaterThan(stitchSpanX(knotted));
  });

  it("ring marks add accent stitches at crossings", () => {
    for (const style of ALL_RING_STYLES) {
      const marked = piece({ mode: "rings", ringMarks: true, ringStyle: style });
      const plain = piece({ mode: "rings", ringMarks: false, ringStyle: style });
      expect(marked.ops.length).toBeGreaterThan(plain.ops.length);
      expect(opsWithColor(marked, d.accent)).toBeGreaterThan(
        opsWithColor(plain, d.accent),
      );
    }
  });

  it("tour artist prints the billing line", () => {
    // The diagonal bill letterspaces the artist in lowercase.
    const diagonal = piece({ mode: "tour", tourArtist: "NOVA TIDE" });
    expect(textStrings(diagonal)).toContain("Nova tide");
    const ledger = piece({
      mode: "tour",
      tourArtist: "nova tide",
      tourLayout: "ledger",
    });
    expect(textStrings(ledger)).toContain("NOVA TIDE");
  });

  it("tour dates parse one show per line and clamp long bills", () => {
    const entries = parseTourDates("6/1  Lisbon, Portugal  Jardim\n7/2|Porto|Casa");
    expect(entries).toEqual([
      { city: "Lisbon, Portugal", date: "6/1", venue: "Jardim" },
      { city: "Porto", date: "7/2", venue: "Casa" },
    ]);
    const manyLines = Array.from(
      { length: 80 },
      (_, index) => `${index + 1}/1  City ${index + 1}  Venue`,
    ).join("\n");
    expect(parseTourDates(manyLines)).toHaveLength(EPHEMERA_MAX_TOUR_LINES);
    const few = piece({ mode: "tour", tourDates: "6/1  Lisbon  Jardim" });
    const many = piece({ mode: "tour", tourDates: manyLines });
    expect(many.texts).toBeGreaterThan(few.texts);
  });

  it("every tour layout composes a distinct bill", () => {
    const diagonal = piece({ mode: "tour", tourLayout: "diagonal" });
    const orbit = piece({ mode: "tour", tourLayout: "orbit" });
    const ledger = piece({ mode: "tour", tourLayout: "ledger" });
    expect(diagonal.ops.some((op) => op.kind === "line")).toBe(true);
    expect(orbit.ops.some((op) => op.kind === "circle")).toBe(true);
    expect(opsWithColor(ledger, d.accent)).toBeGreaterThan(0);
    const signatures = new Set([
      signature(diagonal),
      signature(orbit),
      signature(ledger),
    ]);
    expect(signatures.size).toBe(3);
  });

  it("tour leading respaces the bill", () => {
    // Only the accent show blocks respace; the headline and folio stay.
    const spanFor = (leading: number): number => {
      const ys = textOps(
        piece({ mode: "tour", tourLayout: "ledger", tourLeading: leading }),
      )
        .filter((op) => op.color === d.accent)
        .map((op) => op.y);
      return Math.max(...ys) - Math.min(...ys);
    };
    expect(spanFor(1.8)).toBeGreaterThan(spanFor(0.8));
  });
});
