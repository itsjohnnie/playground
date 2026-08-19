/**
 * "Copy SVG" payload: the committed piece serialized as a standalone
 * SVG document — the same display list the preview and PNG export
 * paint, so the vector artifact always matches the raster.
 */

import type { ToolcraftState } from "@/toolcraft/runtime";

import { computePiece } from "./engine";
import { ephemeraOpsToSvg } from "./ops";
import {
  getEphemeraSceneRect,
  readEphemeraBackground,
  readEphemeraParams,
} from "./params";

export function buildEphemeraSvgPayload(
  state: Readonly<ToolcraftState>,
): string {
  const { height, width } =
    state.canvas.mode === "infinite"
      ? {
          height: getEphemeraSceneRect(state).height,
          width: getEphemeraSceneRect(state).width,
        }
      : state.canvas.size;
  const params = readEphemeraParams(state.values, width, height);
  const model = computePiece(params);
  const includeBackground = state.values["export.includeBackground"] !== false;
  return ephemeraOpsToSvg(
    model,
    width,
    height,
    includeBackground ? readEphemeraBackground(state.values) : null,
  );
}
