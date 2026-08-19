import {
  registerToolcraftRendererPipeline,
  type ToolcraftRendererPipelinePassContract,
} from "@/toolcraft/runtime";

import type { EphemeraModel } from "./ops";
import { EPHEMERA_TARGETS } from "./params";

/**
 * One canonical compiled pipeline for the Ephemera Press Canvas 2D
 * renderer.
 *
 * - `render-piece`: compiles committed state into the display list and
 *   rasterizes it into the preview canvas at CSS x devicePixelRatio x
 *   selected render-scale backing. There is no animation loop; the pass
 *   runs only on interactions.
 * - `export-frame`: compiles and draws one deterministic frame into the
 *   runtime-owned export canvas at the selected output resolution.
 */

type EphemeraPipelinePasses = {
  "render-piece": ToolcraftRendererPipelinePassContract<EphemeraModel>;
  "export-frame": ToolcraftRendererPipelinePassContract<void>;
};

const t = EPHEMERA_TARGETS;

const valueTargets = [
  t.mode,
  t.seed,
  t.ink,
  t.accent,
  t.poemText,
  t.poemArrangement,
  t.poemSpread,
  t.poemLeading,
  t.poemScale,
  t.ringStyle,
  t.ringWords,
  t.ringCount,
  t.ringSize,
  t.ringGather,
  t.ringMarks,
  t.tourArtist,
  t.tourDates,
  t.tourLayout,
  t.tourLeading,
  t.sheetWords,
  t.sheetPattern,
  t.sheetCell,
  t.sheetVoid,
  t.sheetEmphasis,
  t.wheelInstrument,
  t.wheelDivisions,
  t.wheelRings,
  t.wheelNotches,
  t.background,
  t.includeBackground,
] as const;

const sliderDragTargets = [
  t.seed,
  t.poemSpread,
  t.poemLeading,
  t.poemScale,
  t.ringCount,
  t.ringSize,
  t.ringGather,
  t.tourLeading,
  t.sheetCell,
  t.sheetVoid,
  t.sheetEmphasis,
  t.wheelDivisions,
  t.wheelRings,
] as const;

export const ephemeraRendererPipeline =
  registerToolcraftRendererPipeline<EphemeraPipelinePasses>()({
    interactionInvalidation: [
      {
        interaction: "initial-render",
        invalidates: ["render-piece"],
        mustNotInvalidate: ["export-frame"],
        targets: ["canvas.initial-render"],
      },
      {
        interaction: "control-change",
        invalidates: ["render-piece"],
        mustNotInvalidate: ["export-frame"],
        targets: [...valueTargets],
      },
      {
        interaction: "control-drag",
        invalidates: ["render-piece"],
        mustNotInvalidate: ["export-frame"],
        targets: [...sliderDragTargets],
      },
      {
        interaction: "viewport-drag",
        invalidates: [],
        mustNotInvalidate: ["render-piece", "export-frame"],
        targets: ["canvas.viewport"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: ["render-piece", "export-frame"],
        targets: ["canvas.viewport"],
      },
      {
        interaction: "export",
        invalidates: ["export-frame"],
        mustNotInvalidate: ["render-piece"],
        targets: [t.imageFormat, t.imageResolution],
      },
    ],
    passes: [
      {
        cost: {
          dimensions: ["sheet-cell", "wheel-divisions"],
          frequency: "interaction",
          relationship: "product",
        },
        id: "render-piece",
        inputs: [...valueTargets],
        invalidatedBy: [...valueTargets],
        kind: "composite",
        lifecycle: { cache: "none", resourceScope: "call" },
        output: "preview",
        quality: "retina",
        runsOn: "main",
      },
      {
        cost: {
          dimensions: ["sheet-cell", "wheel-divisions", "export-longest-edge"],
          frequency: "batch",
          relationship: "product",
        },
        id: "export-frame",
        inputs: [...valueTargets, t.imageFormat, t.imageResolution],
        invalidatedBy: [t.imageFormat, t.imageResolution],
        kind: "export",
        lifecycle: { cache: "none", resourceScope: "call" },
        output: "export",
        quality: "export",
        runsOn: "main",
      },
    ],
    runtimeId: "ephemera-canvas-2d-v1",
  });
