import { expect, test } from "./toolcraft-product-test";

import { expectToolcraftAcceptanceOutcome } from "./browser-acceptance-outcome-helpers";
import {
  expectToolcraftInfinityCanvasImageExportEvidence,
  expectToolcraftInfinityCanvasModeEvidence,
  observeInfinityCanvas,
} from "./browser-infinity-canvas-evidence";
import { expectToolcraftCanvasRenderScaleEvidence } from "./browser-render-scale-evidence";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { inspectToolcraftImageDownload } from "./image-artifact-inspection";
import {
  dragSliderWithLiveProductUpdate,
  EPHEMERA_CANVAS_SELECTOR,
  EPHEMERA_PAPER_RGBA,
  exportImageDownload,
  getFiniteImageExportSize,
  openEphemeraSession,
  setSwitchByTarget,
} from "./product-support";

const EXPECTED_SCENE_RECT = { height: 1510, width: 1240, x: -620, y: -755 };

test.setTimeout(240_000);

test("browser: render scale keeps exact backing pixels in interaction and steady states", async ({
  page,
}) => {
  const session = await openEphemeraSession(page);

  const lowerScale = session.targetAction("canvas.renderScale", (currentPage) =>
    dragSliderWithLiveProductUpdate(currentPage, "canvas.renderScale", 0),
  );
  await expectToolcraftProductObservableToChange(session, lowerScale, {
    requirementId: "canvas.render-scale",
    selector: EPHEMERA_CANVAS_SELECTOR,
  });

  await dragSliderWithLiveProductUpdate(page, "canvas.renderScale", 1);
  await expectToolcraftCanvasRenderScaleEvidence(page, {
    canvasSelector: EPHEMERA_CANVAS_SELECTOR,
    requirementId: "canvas.render-scale",
    selectedScale: 2,
    stateTransitions: [
      {
        run: () =>
          dragSliderWithLiveProductUpdate(page, "poem.spread", 0.85),
        state: "interaction",
      },
      {
        run: () => page.waitForTimeout(400),
        state: "steady",
      },
    ],
    target: "canvas.renderScale",
  });
});

test("browser: infinity canvas removes finite sizing and restores it", async ({
  page,
}) => {
  await openEphemeraSession(page);

  const before = await observeInfinityCanvas(page);
  await setSwitchByTarget(page, "canvas.infinity", true);
  const enabled = await observeInfinityCanvas(page);

  const viewport = page.getByRole("application", { name: "Canvas viewport" });
  const viewportBox = await viewport.boundingBox();
  if (!viewportBox) throw new Error("Canvas viewport must expose geometry.");
  await page.mouse.move(
    viewportBox.x + viewportBox.width * 0.7,
    viewportBox.y + viewportBox.height * 0.85,
  );
  await page.mouse.down();
  await page.mouse.move(
    viewportBox.x + viewportBox.width * 0.4,
    viewportBox.y + viewportBox.height * 0.6,
    { steps: 5 },
  );
  await page.mouse.up();
  const afterPan = await observeInfinityCanvas(page);

  await page.reload();
  await expect(page.locator(EPHEMERA_CANVAS_SELECTOR)).toBeVisible();
  const afterReload = await observeInfinityCanvas(page);

  await setSwitchByTarget(page, "canvas.infinity", false);
  const restored = await observeInfinityCanvas(page);

  await page.getByRole("button", { name: "Undo" }).click();
  const undone = await observeInfinityCanvas(page);
  await page.getByRole("button", { name: "Redo" }).click();
  const redone = await observeInfinityCanvas(page);

  await expectToolcraftInfinityCanvasModeEvidence(
    { afterPan, afterReload, before, enabled, redone, restored, undone },
    {
      expectedFiniteSize: { height: 1350, width: 1080 },
      expectedSceneRect: EXPECTED_SCENE_RECT,
      requirementId: "canvas.infinity",
      target: "canvas.infinity",
    },
  );
});

test("browser: infinite export crops to the product scene bounds", async ({
  page,
}) => {
  await openEphemeraSession(page);

  const finiteDownload = await exportImageDownload(page);
  const finite = await inspectToolcraftImageDownload({
    backgroundRgba: EPHEMERA_PAPER_RGBA,
    download: finiteDownload,
    page,
  });

  await setSwitchByTarget(page, "canvas.infinity", true);
  const infiniteDownload = await exportImageDownload(page);
  const infinite = await inspectToolcraftImageDownload({
    backgroundRgba: EPHEMERA_PAPER_RGBA,
    download: infiniteDownload,
    page,
  });

  const expectedFinite = getFiniteImageExportSize("4k");
  const infiniteRatio = 4096 / EXPECTED_SCENE_RECT.height;
  await expectToolcraftInfinityCanvasImageExportEvidence(
    {
      finite: {
        byteLength: finite.inspection.byteLength,
        height: finite.inspection.height,
        width: finite.inspection.width,
      },
      infinite: {
        byteLength: infinite.inspection.byteLength,
        height: infinite.inspection.height,
        width: infinite.inspection.width,
      },
    },
    {
      expectedFiniteSize: expectedFinite,
      expectedInfiniteSize: {
        height: 4096,
        width: Math.round(EXPECTED_SCENE_RECT.width * infiniteRatio),
      },
      requirementId: "canvas.infinity-export",
      target: "canvas.infinity",
    },
  );
});

test("browser: canvas width edit resizes the sheet artboard", async ({
  page,
}) => {
  await openEphemeraSession(page);

  const initial = await observeInfinityCanvas(page);
  expect(initial.finiteCanvasSize).toEqual({ height: 1350, width: 1080 });

  await expectToolcraftAcceptanceOutcome(
    async () => (await observeInfinityCanvas(page)).finiteCanvasSize?.width,
    async () => {
      const field = await getToolcraftControlFieldByTarget(
        page,
        "canvas.size.width",
      );
      const input = field.locator("input").first();
      await input.fill("1200");
      await input.press("Enter");
    },
    {
      evidenceType: "command-side-effect",
      requirementId: "canvas.default-size",
    },
  );
  await expect
    .poll(async () => (await observeInfinityCanvas(page)).finiteCanvasSize?.width)
    .toBe(1200);
});
