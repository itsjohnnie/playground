import type { ToolcraftProductExportRenderer } from "@/toolcraft/runtime";

import { computePiece } from "./engine";
import { paintEphemera } from "./ops";
import { readEphemeraParams } from "./params";

/**
 * One deterministic scene-coordinate frame shared by runtime image
 * export. The runtime owns background composition, output sizing,
 * encoding, and download; the product draws the committed piece, which
 * is already a pure function of committed state (no animation phase).
 */
export const ephemeraExportRenderer: ToolcraftProductExportRenderer = {
  baseFileName: "ephemera",
  renderFrame({ context, frame, state }) {
    const params = readEphemeraParams(state.values, frame.width, frame.height);
    const model = computePiece(params);
    context.save();
    context.translate(frame.x, frame.y);
    paintEphemera(context, model);
    context.restore();
  },
};
