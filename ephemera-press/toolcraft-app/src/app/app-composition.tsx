import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react";

import { appSchema } from "./app-schema";
import { EphemeraCanvas } from "./ephemera/ephemera-canvas";
import { ephemeraExportRenderer } from "./ephemera/export-renderer";
import { getEphemeraSceneRect } from "./ephemera/params";
import { ephemeraRendererPipeline } from "./ephemera/renderer-pipeline";
import { buildEphemeraSvgPayload } from "./ephemera/svg-payload";

export const appComposition: ToolcraftAppComposition = {
  canvasContent: <EphemeraCanvas />,
  exportRenderer: ephemeraExportRenderer,
  onPanelAction: ({ action, state }) => {
    if (action.value === "copy.svg") {
      return navigator.clipboard.writeText(buildEphemeraSvgPayload(state));
    }
    return undefined;
  },
  renderDefaultCanvasMedia: false,
  rendererPipelineRegistration: ephemeraRendererPipeline,
  sceneBoundsProvider: ({ state }) => [getEphemeraSceneRect(state)],
  schema: appSchema,
};
