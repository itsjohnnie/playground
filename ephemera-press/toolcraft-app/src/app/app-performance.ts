import {
  defineToolcraftPerformance,
  deriveToolcraftPerformancePaths,
  type ToolcraftEnvelopePerformanceConfig,
  type ToolcraftPerformanceScenario,
} from "@/toolcraft/runtime";

import { appSchema } from "./app-schema";
import { EPHEMERA_TARGETS } from "./ephemera/params";
import { ephemeraRendererPipeline } from "./ephemera/renderer-pipeline";

const t = EPHEMERA_TARGETS;

const workloadEnvelope = {
  dimensions: [
    {
      batchMax: 10,
      defaultValue: 22,
      id: "sheet-cell",
      interactiveMax: 10,
      mapping: "direct",
      source: {
        kind: "schema-target",
        target: t.sheetCell,
        workloadBoundary: "minimum",
      },
      unit: "px",
    },
    {
      batchMax: 96,
      defaultValue: 36,
      id: "wheel-divisions",
      interactiveMax: 96,
      mapping: "direct",
      source: {
        kind: "schema-target",
        target: t.wheelDivisions,
        workloadBoundary: "maximum",
      },
      unit: "ticks",
    },
    {
      batchMax: 8192,
      defaultValue: 4096,
      id: "export-longest-edge",
      mapping: "quadratic",
      source: {
        kind: "schema-target",
        target: t.imageResolution,
      },
      unit: "px",
    },
  ],
} as const;

/**
 * One scenario per canonical derived path. Path ids come from
 * `deriveToolcraftPerformancePaths`; they are never hand-authored.
 */
const derivedPaths = deriveToolcraftPerformancePaths(appSchema, {
  rendererPipeline: ephemeraRendererPipeline,
  rendererStrategy: "canvas-2d",
  scenarios: [],
  usesCustomRenderer: true,
  workloadEnvelope,
});

const scenarioDetails: Record<
  string,
  Readonly<{
    controlLabel?: string;
    expectedObservable: string;
    fixture: string;
    userFacing: string;
  }>
> = {
  "control-change": {
    controlLabel: "Pattern",
    expectedObservable:
      "The committed value composes a changed piece in the next frame.",
    fixture: "compiled sheet-cell and wheel-division workload",
    userFacing: "discrete control commit",
  },
  "control-drag": {
    controlLabel: "Cell size",
    expectedObservable:
      "The word grid updates live during the slider drag, not only on release.",
    fixture: "compiled sheet-cell and wheel-division workload",
    userFacing: "slider drag",
  },
  export: {
    expectedObservable:
      "The exported image downloads with the selected resolution's long edge.",
    fixture: "compiled export resolution plus sheet workload",
    userFacing: "PNG export",
  },
  "initial-render": {
    expectedObservable:
      "The first painted frame shows the composed piece.",
    fixture: "compiled sheet-cell and wheel-division workload",
    userFacing: "first canvas paint",
  },
  "viewport-drag": {
    expectedObservable:
      "Canvas pan moves the viewport transform without recomposing the piece.",
    fixture: "default workload",
    userFacing: "canvas pan",
  },
  "viewport-zoom": {
    expectedObservable:
      "Canvas zoom scales the viewport transform without recomposing the piece.",
    fixture: "default workload",
    userFacing: "canvas zoom",
  },
};

const scenarios: ToolcraftPerformanceScenario[] = derivedPaths.map((path) => {
  const details = scenarioDetails[path.interaction];
  if (!details) {
    throw new Error(`Unmapped performance path interaction: ${path.interaction}`);
  }
  const base = {
    automated: true,
    automatedTestName: `perf scenario ${path.interaction}: covers its canonical derived path`,
    browser: true,
    browserTestName: `browser perf: toolcraft path ${path.id}`,
    ...(details.controlLabel ? { controlLabel: details.controlLabel } : {}),
    coversTargets: [...path.targets],
    expectedObservable: details.expectedObservable,
    fixture: details.fixture,
    id: `perf.${path.interaction}`,
    pathId: path.id,
  };
  if (path.interaction === "export") {
    return {
      ...base,
      actionValue: "export.png",
      completionEvidence: "download",
      controlLabel: "Export PNG",
      interaction: "export",
    };
  }
  return {
    ...base,
    interaction: path.interaction,
  };
});

export const appPerformance: ToolcraftEnvelopePerformanceConfig =
  defineToolcraftPerformance({
    fixtureAdapters: {
      dimensions: {
        "export-longest-edge": {
          apply: (value: number) =>
            value >= 8192 ? "8k" : value >= 4096 ? "4k" : "2k",
          dimensionId: "export-longest-edge",
          domain: {
            kind: "schema-options",
            optionValues: ["2k", "4k", "8k"],
            target: t.imageResolution,
          },
          entries: [
            { appliedValue: "2k", value: 2048 },
            { appliedValue: "4k", value: 4096 },
            { appliedValue: "8k", value: 8192 },
          ],
          kind: "exhaustive-discrete",
          observe: (value) =>
            value === "8k" ? 8192 : value === "4k" ? 4096 : 2048,
        },
        "sheet-cell": {
          apply: (value: number) => Math.round(value),
          dimensionId: "sheet-cell",
          kind: "continuous",
          observe: (value) => Number(value),
        },
        "wheel-divisions": {
          apply: (value: number) => Math.round(value),
          dimensionId: "wheel-divisions",
          kind: "continuous",
          observe: (value) => Number(value),
        },
      },
    },
    rendererPipeline: ephemeraRendererPipeline,
    rendererStrategy: "canvas-2d",
    rendererTechnique: {
      exportRenderer: "canvas-2d",
      fidelityRisks: [
        "Glyph rasterization differs slightly between preview backing scales, export resolutions, and platform font stacks.",
      ],
      layers: [
        {
          content: ["text", "dense-pattern"],
          exportMode: "composited",
          id: "piece",
          intentionalRasterizationReason:
            "The texture sheet sets thousands of repeated word slots and the wheels draw hundreds of rotated tick numerals; as DOM/SVG nodes those thrash layout on every slider drag, so the piece rasterizes into one canvas while the Copy SVG action still serializes the identical display list as vectors on demand.",
          kind: "product-foreground",
          primitiveCount: "medium",
          renderer: "canvas-2d",
          uiSelector: "[data-toolcraft-product-output]",
        },
      ],
      performanceRisks: [
        "Small sheet cells multiply set word slots quadratically; every control commit recomposes and repaints the full display list.",
      ],
      previewRenderer: "canvas-2d",
      productRepresentation: "pixel",
      rendererStrategy: "canvas-2d",
      sourceRepresentation: "procedural-data",
      whyNotAlternativeStrategies: [
        "SVG/DOM: thousands of positioned text nodes would thrash layout during slider drags; a single canvas repaint is cheaper and the SVG artifact is still produced on demand by the Copy SVG serializer.",
        "WebGL: the workload is a few thousand fillText/arc calls per interaction with no per-frame animation; a GPU text pipeline adds atlas complexity without a fidelity gain.",
      ],
    },
    scenarios,
    usesCustomRenderer: true,
    workloadEnvelope,
  });
