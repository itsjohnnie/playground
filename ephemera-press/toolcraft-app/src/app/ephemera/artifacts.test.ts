import { describe, expect, it } from "vitest";

import { shouldIncludeToolcraftPreviewBackground } from "@/toolcraft/runtime";
import type { ToolcraftState } from "@/toolcraft/runtime";

import { appSchema } from "../app-schema";
import {
  computePiece,
  mixHex,
  type EphemeraParams,
  type WheelInstrument,
} from "./engine";
import { ephemeraExportRenderer } from "./export-renderer";
import { paintEphemera, type EphemeraModel, type EphemeraTextOp } from "./ops";
import {
  EPHEMERA_DEFAULTS,
  EPHEMERA_SHEET_BLEED,
  EPHEMERA_SHEET_HEIGHT,
  EPHEMERA_SHEET_WIDTH,
  EPHEMERA_TARGETS,
  getEphemeraSceneRect,
  readEphemeraBackground,
  readEphemeraParams,
} from "./params";
import { buildEphemeraSvgPayload } from "./svg-payload";

const ALL_INSTRUMENTS: readonly WheelInstrument[] = [
  "gauge",
  "knitting",
  "dose",
  "dial",
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

type RecordedText = { color: string; text: string; x: number; y: number };

function createRecordingContext() {
  const texts: RecordedText[] = [];
  const arcs: { r: number; x: number; y: number }[] = [];
  const context = {
    arc(x: number, y: number, r: number) {
      arcs.push({ r, x, y });
    },
    beginPath() {},
    fill() {},
    fillRect() {},
    fillStyle: "" as string,
    fillText(value: string, x: number, y: number) {
      texts.push({ color: String(context.fillStyle), text: value, x, y });
    },
    font: "" as string,
    lineCap: "" as string,
    lineJoin: "" as string,
    lineTo() {},
    lineWidth: 0 as number,
    moveTo() {},
    restore() {},
    rotate() {},
    save() {},
    stroke() {},
    strokeStyle: "" as string,
    textAlign: "" as string,
    textBaseline: "" as string,
    translate() {},
  };
  return { arcs, context, texts };
}

function makeState(values: Record<string, unknown>): ToolcraftState {
  return {
    canvas: {
      mode: "finite",
      offset: { x: 0, y: 0 },
      size: appSchema.canvas.size,
      zoom: 1,
    },
    mediaAssets: [],
    values,
  } as unknown as ToolcraftState;
}

describe("ephemera sheets, wheels, and artifacts", () => {
  it("sheet words fill the grid with the typed tokens", () => {
    const model = piece({ mode: "sheet", sheetWords: "RAIN CHORUS" });
    const texts = new Set(textStrings(model));
    expect(texts.has("RAIN")).toBe(true);
    expect(texts.has("CHORUS")).toBe(true);
  });

  it("every sheet pattern fills the grid differently", () => {
    const weave = piece({ mode: "sheet", sheetPattern: "weave" });
    const ledger = piece({ mode: "sheet", sheetPattern: "ledger" });
    const patches = piece({ mode: "sheet", sheetPattern: "patches" });
    // The ledger numbers every slot in the accent ink.
    expect(opsWithColor(ledger, EPHEMERA_DEFAULTS.accent)).toBeGreaterThan(
      opsWithColor(weave, EPHEMERA_DEFAULTS.accent),
    );
    const signatures = new Set([
      signature(weave),
      signature(ledger),
      signature(patches),
    ]);
    expect(signatures.size).toBe(3);
  });

  it("sheet cell size retiles the word grid quadratically", () => {
    const fine = piece({ mode: "sheet", sheetCell: 12 });
    const coarse = piece({ mode: "sheet", sheetCell: 34 });
    expect(fine.texts).toBeGreaterThan(coarse.texts * 2);
  });

  it("sheet void empties a fraction of slots", () => {
    const full = piece({ mode: "sheet", sheetVoid: 0 });
    const sparse = piece({ mode: "sheet", sheetVoid: 0.8 });
    expect(sparse.texts).toBeLessThan(full.texts);
  });

  it("sheet emphasis reweights words toward heavy and accent ink", () => {
    const heavyCount = (emphasis: number): number =>
      textOps(piece({ mode: "sheet", sheetEmphasis: emphasis })).filter(
        (op) => op.weight === 700,
      ).length;
    expect(heavyCount(0.9)).toBeGreaterThan(heavyCount(0));
    expect(
      opsWithColor(
        piece({ mode: "sheet", sheetEmphasis: 0.9 }),
        EPHEMERA_DEFAULTS.accent,
      ),
    ).toBeGreaterThan(0);
  });

  it("every wheel instrument draws a distinct calculating face", () => {
    const gauge = piece({ mode: "wheel", wheelInstrument: "gauge" });
    expect(textStrings(gauge)).toContain("U.S. STANDARD GAUGE");
    const knitting = piece({ mode: "wheel", wheelInstrument: "knitting" });
    expect(textStrings(knitting)).toContain("KNITTING PIN");
    const dose = piece({ mode: "wheel", wheelInstrument: "dose" });
    expect(textStrings(dose)).toContain("START");
    const dial = piece({ mode: "wheel", wheelInstrument: "dial" });
    expect(dial.ops.some((op) => op.kind === "poly")).toBe(true);
    const signatures = new Set([
      signature(gauge),
      signature(knitting),
      signature(dose),
      signature(dial),
    ]);
    expect(signatures.size).toBe(4);
  });

  it("wheel divisions change the scale resolution", () => {
    for (const instrument of ALL_INSTRUMENTS) {
      const sparse = piece({
        mode: "wheel",
        wheelDivisions: 24,
        wheelInstrument: instrument,
      });
      const dense = piece({
        mode: "wheel",
        wheelDivisions: 72,
        wheelInstrument: instrument,
      });
      expect(dense.ops.length).toBeGreaterThan(sparse.ops.length);
    }
  });

  it("wheel rings add concentric scales", () => {
    for (const instrument of ALL_INSTRUMENTS) {
      const single = piece({
        mode: "wheel",
        wheelInstrument: instrument,
        wheelRings: 1,
      });
      const six = piece({
        mode: "wheel",
        wheelInstrument: instrument,
        wheelRings: 6,
      });
      expect(six.ops.length).toBeGreaterThan(single.ops.length);
    }
  });

  it("wheel notches cut marks into the rim", () => {
    for (const instrument of ALL_INSTRUMENTS) {
      const notched = piece({
        mode: "wheel",
        wheelInstrument: instrument,
        wheelNotches: true,
      });
      const smooth = piece({
        mode: "wheel",
        wheelInstrument: instrument,
        wheelNotches: false,
      });
      expect(notched.ops.length).toBeGreaterThan(smooth.ops.length);
    }
  });

  it("include background gates the preview background fill", () => {
    const withBackground = makeState({
      [EPHEMERA_TARGETS.includeBackground]: true,
    });
    const withoutBackground = makeState({
      [EPHEMERA_TARGETS.includeBackground]: false,
    });
    expect(
      shouldIncludeToolcraftPreviewBackground({ state: withBackground }),
    ).toBe(true);
    expect(
      shouldIncludeToolcraftPreviewBackground({ state: withoutBackground }),
    ).toBe(false);
  });

  it("background color is read from state for preview and export", () => {
    expect(
      readEphemeraBackground({ [EPHEMERA_TARGETS.background]: "#123456" }),
    ).toBe("#123456");
    expect(readEphemeraBackground({})).toBe(EPHEMERA_DEFAULTS.background);
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("copy svg payload serializes the committed piece", () => {
    const state = makeState({});
    const payload = buildEphemeraSvgPayload(state);
    expect(payload.startsWith("<svg ")).toBe(true);
    expect(payload.endsWith("</svg>")).toBe(true);
    expect(payload).toContain("harbour");
    expect(payload).toContain(EPHEMERA_DEFAULTS.background);
    const transparent = buildEphemeraSvgPayload(
      makeState({ [EPHEMERA_TARGETS.includeBackground]: false }),
    );
    expect(transparent).not.toContain(`fill="${EPHEMERA_DEFAULTS.background}"`);
  });

  it("export renderer draws a deterministic frame for the export action", () => {
    const state = makeState({});
    const exportFrameArgs = (context: CanvasRenderingContext2D) => ({
      context,
      frame: { height: 1350, width: 1080, x: 0, y: 0 },
      pixelRatio: 1,
      rendererPipeline: null,
      state,
      timeSeconds: 0,
      timelineProgress: 0,
    });
    const first = createRecordingContext();
    ephemeraExportRenderer.renderFrame(
      exportFrameArgs(first.context as unknown as CanvasRenderingContext2D),
    );
    const second = createRecordingContext();
    ephemeraExportRenderer.renderFrame(
      exportFrameArgs(second.context as unknown as CanvasRenderingContext2D),
    );
    expect(first.texts.length).toBeGreaterThan(0);
    expect(first.texts).toEqual(second.texts);
    const expected = computePiece(
      readEphemeraParams(state.values, 1080, 1350),
    );
    expect(first.texts.length).toBe(expected.texts);
  });

  it("scene bounds provider fixes the portrait sheet rect", () => {
    const rect = getEphemeraSceneRect(makeState({}));
    const width = EPHEMERA_SHEET_WIDTH + EPHEMERA_SHEET_BLEED * 2;
    const height = EPHEMERA_SHEET_HEIGHT + EPHEMERA_SHEET_BLEED * 2;
    expect(rect).toEqual({
      height,
      width,
      x: -width / 2,
      y: -height / 2,
    });
  });

  it("infinite export scene rect is the constant sheet", () => {
    const defaultRect = getEphemeraSceneRect(makeState({}));
    const reconfigured = getEphemeraSceneRect(
      makeState({ [EPHEMERA_TARGETS.sheetCell]: 10, [EPHEMERA_TARGETS.seed]: 99 }),
    );
    expect(reconfigured).toEqual(defaultRect);
    // The bleed distinguishes the infinite crop from the finite sheet.
    expect(defaultRect.width).not.toBe(EPHEMERA_SHEET_WIDTH);
    expect(defaultRect.height).not.toBe(EPHEMERA_SHEET_HEIGHT);
  });

  it("paints every op kind through the shared painter", () => {
    const recording = createRecordingContext();
    const model = piece({ mode: "wheel", wheelInstrument: "dial" });
    paintEphemera(
      recording.context as unknown as CanvasRenderingContext2D,
      model,
    );
    expect(recording.texts.length).toBe(model.texts);
    expect(recording.arcs.length).toBeGreaterThan(0);
  });
});
