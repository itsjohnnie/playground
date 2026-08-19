import { expect, type Page } from "@playwright/test";

import { deriveToolcraftPerformancePaths } from "@/toolcraft/runtime";

import { appPerformance } from "../src/app/app-performance";
import { appSchema } from "../src/app/app-schema";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import type {
  ToolcraftPerformanceCanvasBacking,
  ToolcraftPerformancePathAdapter,
} from "./performance-path-adapter-contract";
import type { ToolcraftCompiledFixtureApplications } from "./performance-compiled-fixture-runtime";
import { dragToolcraftSliderByTarget } from "./performance-slider-helpers";

const CANVAS_SELECTOR = "[data-toolcraft-product-output]";

export const appPerformanceCanvasBacking:
  | ToolcraftPerformanceCanvasBacking
  | undefined = { canvasSelector: CANVAS_SELECTOR };

const pathsByInteraction = new Map(
  deriveToolcraftPerformancePaths(appSchema, appPerformance).map((path) => [
    path.interaction as string,
    path,
  ]),
);

function requirePathId(interaction: string): string {
  const path = pathsByInteraction.get(interaction);
  if (!path) throw new Error(`Missing derived path for "${interaction}".`);
  return path.id;
}

async function preparePage(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator(CANVAS_SELECTOR)).toBeVisible();
}

async function readCanvasSignature(page: Page): Promise<string> {
  return page.evaluate((selector) => {
    const canvas = document.querySelector<HTMLCanvasElement>(selector);
    return `${canvas?.dataset.pieceMode}:${canvas?.dataset.pieceTexts}/${canvas?.dataset.pieceMarks}`;
  }, CANVAS_SELECTOR);
}

async function selectPieceMode(page: Page, tabLabel: string): Promise<void> {
  const field = await getToolcraftControlFieldByTarget(page, "piece.mode");
  await field.getByRole("tab", { exact: true, name: tabLabel }).click();
}

async function setSliderExact(
  page: Page,
  target: string,
  value: number,
  min: number,
  step: number,
): Promise<void> {
  const field = await getToolcraftControlFieldByTarget(page, target);
  const slider = field.getByRole("slider").first();
  await slider.press("Home");
  const presses = Math.round((value - min) / step);
  for (let index = 0; index < presses; index += 1) {
    await slider.press("ArrowRight");
  }
  await expect(slider).toHaveAttribute("aria-valuenow", String(value));
}

async function readSliderValue(page: Page, target: string): Promise<number> {
  const field = await getToolcraftControlFieldByTarget(page, target);
  return Number(
    await field.getByRole("slider").first().getAttribute("aria-valuenow"),
  );
}

async function selectResolution(page: Page, value: string): Promise<void> {
  const field = await getToolcraftControlFieldByTarget(
    page,
    "export.image.resolution",
  );
  await field.getByRole("combobox").click();
  await page
    .locator('[data-slot="select-item"]')
    .filter({ hasText: new RegExp(`^${value.toUpperCase()}$`) })
    .first()
    .click();
}

async function readResolution(page: Page): Promise<string> {
  const field = await getToolcraftControlFieldByTarget(
    page,
    "export.image.resolution",
  );
  const text = (await field.getByRole("combobox").innerText()).trim();
  return text.toLowerCase();
}

/**
 * The compiled workload dimensions live on mode-gated sliders: the
 * sheet-cell dimension is reachable in Sheet mode and the
 * wheel-divisions dimension in Wheel mode. Each application switches to
 * the owning mode before editing, then returns to Sheet so the
 * measured interaction runs against the densest composition.
 */
function workloadFixtureApplications(
  page: Page,
): ToolcraftCompiledFixtureApplications {
  return {
    "sheet-cell": {
      applyValue: async (value) => {
        await selectPieceMode(page, "Sheet");
        await setSliderExact(page, "sheet.cell", Number(value), 10, 1);
      },
      observeValue: async () => {
        await selectPieceMode(page, "Sheet");
        return readSliderValue(page, "sheet.cell");
      },
    },
    "wheel-divisions": {
      applyValue: async (value) => {
        await selectPieceMode(page, "Wheel");
        await setSliderExact(page, "wheel.divisions", Number(value), 16, 1);
        await selectPieceMode(page, "Sheet");
      },
      observeValue: async () => {
        await selectPieceMode(page, "Wheel");
        const observed = await readSliderValue(page, "wheel.divisions");
        await selectPieceMode(page, "Sheet");
        return observed;
      },
    },
  };
}

function exportFixtureApplications(
  page: Page,
): ToolcraftCompiledFixtureApplications {
  return {
    ...workloadFixtureApplications(page),
    "export-longest-edge": {
      applyValue: (value) => selectResolution(page, String(value)),
      observeValue: () => readResolution(page),
    },
  };
}

export const appPerformancePathAdapters = [
  {
    action: async ({ page }) => {
      await page.reload();
      await expect(page.locator(CANVAS_SELECTOR)).toBeVisible();
    },
    fixtureApplications: workloadFixtureApplications,
    observeOutcome: ({ page }) => readCanvasSignature(page),
    pathId: requirePathId("initial-render"),
    prepare: preparePage,
  },
  {
    action: async ({ page }) => {
      const field = await getToolcraftControlFieldByTarget(
        page,
        "sheet.pattern",
      );
      await field.getByRole("combobox").click();
      await page
        .locator('[data-slot="select-item"]')
        .filter({ hasText: /^Ledger$/ })
        .first()
        .click();
    },
    fixtureApplications: workloadFixtureApplications,
    observeOutcome: ({ page }) => readCanvasSignature(page),
    pathId: requirePathId("control-change"),
    prepare: preparePage,
  },
  {
    action: async ({ page, path }) => {
      await dragToolcraftSliderByTarget(page, "sheet.cell", 0.2, {
        pathId: path.id,
      });
    },
    fixtureApplications: workloadFixtureApplications,
    observeOutcome: ({ page }) => readCanvasSignature(page),
    pathId: requirePathId("control-drag"),
    prepare: preparePage,
  },
  {
    action: async ({ page }) => {
      const viewport = page.getByRole("application", {
        name: "Canvas viewport",
      });
      const box = await viewport.boundingBox();
      if (!box) throw new Error("Canvas viewport must expose geometry.");
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.85);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width * 0.4,
        box.y + box.height * 0.5,
        { steps: 10 },
      );
      await page.mouse.up();
    },
    pathId: requirePathId("viewport-drag"),
    prepare: preparePage,
  },
  {
    action: async ({ page }) => {
      await page.getByRole("button", { name: "Zoom in" }).click();
    },
    pathId: requirePathId("viewport-zoom"),
    prepare: preparePage,
  },
  {
    fixtureApplications: exportFixtureApplications,
    output: {
      kind: "download",
      label: "Export PNG",
      verify: async (download) => {
        const downloadPath = await download.path();
        if (!downloadPath) {
          throw new Error("Export PNG must produce a download file.");
        }
      },
    },
    pathId: requirePathId("export"),
    prepare: preparePage,
  },
] as const satisfies readonly ToolcraftPerformancePathAdapter[];
