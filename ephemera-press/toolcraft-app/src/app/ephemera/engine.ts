/**
 * The Ephemera Press engine: five deterministic generators of printed
 * ephemera — concrete poems, typewriter ring mandalas, tour bills,
 * repeated-word texture sheets, and circular calculating wheels — each
 * compiling committed state into the shared display list in `ops.ts`.
 * Every generator is a pure function of its parameters; the same seed
 * always sets the same sheet.
 */

import {
  type EphemeraParams,
} from "./core";
import { buildEphemeraModel, type EphemeraModel } from "./ops";
import { poemOps } from "./poem";
import { ringsOps } from "./rings";
import { sheetOps } from "./sheet";
import { tourOps } from "./tour";
import { wheelOps } from "./wheel";

export {
  EPHEMERA_MAX_POEM_CHARS,
  EPHEMERA_MAX_SHEET_CELLS,
  EPHEMERA_MAX_TOUR_LINES,
  EPHEMERA_MAX_WORDS_CHARS,
  mixHex,
  mulberry32,
  type EphemeraMode,
  type EphemeraParams,
  type PoemArrangement,
  type RingStyle,
  type SheetPattern,
  type TourLayout,
  type WheelInstrument,
} from "./core";
export { parseTourDates } from "./tour";

export function computePiece(p: EphemeraParams): EphemeraModel {
  switch (p.mode) {
    case "poem":
      return buildEphemeraModel(poemOps(p));
    case "rings":
      return buildEphemeraModel(ringsOps(p));
    case "tour":
      return buildEphemeraModel(tourOps(p));
    case "sheet":
      return buildEphemeraModel(sheetOps(p));
    case "wheel":
      return buildEphemeraModel(wheelOps(p));
  }
}
