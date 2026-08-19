import { expect, type Download, type Page } from "@playwright/test";

import { getToolcraftApplicabilityPredicates } from "@/toolcraft/runtime";
import {
  appControlSectionInventory,
  getToolcraftApplicabilityRequirementId,
  getToolcraftControlApplicabilityCases,
  type ToolcraftControlApplicabilityCase,
} from "../src/app/app-acceptance";
import { appSchema } from "../src/app/app-schema";
import {
  computePiece,
  type EphemeraMode,
  type EphemeraParams,
} from "../src/app/ephemera/engine";
import {
  EPHEMERA_DEFAULTS,
  readEphemeraParams,
} from "../src/app/ephemera/params";
import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { expectToolcraftControlApplicabilityState } from "./browser-control-applicability-evidence";
import {
  createToolcraftBrowserProofSession,
  type ToolcraftBrowserAction,
  type ToolcraftBrowserProofSession,
} from "./browser-proof-session";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { clickToolcraftPanelActionByLabel } from "./performance-output-action-helpers";

export const EPHEMERA_CANVAS_SELECTOR = "[data-toolcraft-product-output]";

/** Engine parameters at the finite portrait sheet with schema defaults. */
export function baseEngineParams(
  overrides: Partial<EphemeraParams> = {},
): EphemeraParams {
  return {
    ...readEphemeraParams({}, 1080, 1350),
    ...overrides,
  };
}

export function engineCounts(
  mode: EphemeraMode,
  overrides: Partial<EphemeraParams> = {},
): { marks: number; texts: number } {
  const model = computePiece(baseEngineParams({ ...overrides, mode }));
  return { marks: model.marks, texts: model.texts };
}

/** Opens the app and binds a verified proof session. */
export async function openEphemeraSession(
  page: Page,
): Promise<ToolcraftBrowserProofSession> {
  await page.goto("/");
  const session = await createToolcraftBrowserProofSession(page);
  await expect(page.locator(EPHEMERA_CANVAS_SELECTOR)).toBeVisible();
  await expect
    .poll(() => readPieceCounts(page).then((counts) => counts.texts + counts.marks))
    .toBeGreaterThan(0);
  return session;
}

export async function readPieceCounts(
  page: Page,
): Promise<{ marks: number; mode: string; texts: number }> {
  return page.evaluate((selector) => {
    const canvas = document.querySelector<HTMLCanvasElement>(selector);
    return {
      marks: Number(canvas?.dataset.pieceMarks ?? -1),
      mode: canvas?.dataset.pieceMode ?? "",
      texts: Number(canvas?.dataset.pieceTexts ?? -1),
    };
  }, EPHEMERA_CANVAS_SELECTOR);
}

export async function readCanvasPixelSum(page: Page): Promise<number> {
  return page.evaluate((selector) => {
    const canvas = document.querySelector<HTMLCanvasElement>(selector);
    if (!canvas) return -1;
    const context = canvas.getContext("2d");
    if (!context) return -1;
    // Hash the whole canvas with a stride so any composed region counts,
    // including top-anchored pieces whose centre is blank paper.
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let sum = 0;
    for (let index = 0; index < data.length; index += 7) {
      sum = (sum + data[index]! * (index + 1)) % 0xffffffff;
    }
    return sum;
  }, EPHEMERA_CANVAS_SELECTOR);
}

export async function selectPieceTab(
  page: Page,
  optionLabel: string,
): Promise<void> {
  const field = await getToolcraftControlFieldByTarget(page, "piece.mode");
  await field.getByRole("tab", { name: optionLabel, exact: true }).click();
}

export async function selectOptionByTarget(
  page: Page,
  target: string,
  optionLabel: string,
): Promise<void> {
  const field = await getToolcraftControlFieldByTarget(page, target);
  await field.getByRole("combobox").click();
  const option = page
    .locator('[data-slot="select-item"]')
    .filter({ hasText: new RegExp(`^${optionLabel}$`) })
    .first();
  await option.click();
  await expect(field.getByRole("combobox")).toContainText(optionLabel);
}

export async function setSwitchByTarget(
  page: Page,
  target: string,
  checked: boolean,
): Promise<void> {
  const field = await getToolcraftControlFieldByTarget(page, target);
  const switchElement = field.getByRole("switch").first();
  const state = await switchElement.getAttribute("aria-checked");
  if (state !== String(checked)) {
    await switchElement.click();
  }
  await expect(switchElement).toHaveAttribute("aria-checked", String(checked));
}

export async function setColorByLabel(
  page: Page,
  label: string,
  hex: string,
): Promise<void> {
  const input = page.getByRole("textbox", { name: `${label} hex` }).first();
  await input.fill(hex.replace(/^#/, ""));
  await input.press("Enter");
}

/** Types into a single-line `text` control; content commits while typing. */
export async function fillTextByTarget(
  page: Page,
  target: string,
  value: string,
): Promise<void> {
  const field = await getToolcraftControlFieldByTarget(page, target);
  const input = field.locator("input").first();
  await input.fill(value);
}

/** Types into a multiline `code` control; content commits while typing. */
export async function fillCodeByTarget(
  page: Page,
  target: string,
  value: string,
): Promise<void> {
  const field = await getToolcraftControlFieldByTarget(page, target);
  const textarea = field.locator("textarea").first();
  await textarea.fill(value);
}

export async function readSliderValue(
  page: Page,
  target: string,
): Promise<number> {
  const field = await getToolcraftControlFieldByTarget(page, target);
  const value = await field
    .getByRole("slider")
    .first()
    .getAttribute("aria-valuenow");
  return Number(value);
}

/** Steps a slider with the keyboard for exact small value changes. */
export async function stepSliderByTarget(
  page: Page,
  target: string,
  steps: number,
): Promise<void> {
  const field = await getToolcraftControlFieldByTarget(page, target);
  const slider = field.getByRole("slider").first();
  const key = steps >= 0 ? "ArrowRight" : "ArrowLeft";
  for (let index = 0; index < Math.abs(steps); index += 1) {
    await slider.press(key);
  }
}

/**
 * Drags the real slider thumb and asserts BOTH the runtime value and
 * the painted product canvas change during the drag, before pointer
 * release.
 */
export async function dragSliderWithLiveProductUpdate(
  page: Page,
  target: string,
  targetRatio: number,
): Promise<void> {
  const field = await getToolcraftControlFieldByTarget(page, target);
  const slider = field.getByRole("slider").first();
  const track = field.locator('[data-slot="slider"]').first();
  // Manual mouse moves do not auto-scroll like locator clicks do; make
  // sure the slider is inside the panel viewport first.
  await track.scrollIntoViewIfNeeded();
  const thumbBox = await slider.boundingBox();
  const trackBox = await track.boundingBox();
  if (!thumbBox || !trackBox) {
    throw new Error(`Slider "${target}" must expose thumb and track geometry.`);
  }
  const valueBefore = await slider.getAttribute("aria-valuenow");
  const pixelsBefore = await readCanvasPixelSum(page);

  await page.mouse.move(
    thumbBox.x + thumbBox.width / 2,
    thumbBox.y + thumbBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    trackBox.x + trackBox.width * targetRatio,
    trackBox.y + trackBox.height / 2,
    { steps: 6 },
  );
  await expect
    .poll(async () => slider.getAttribute("aria-valuenow"), {
      message: `Slider "${target}" must expose a changed value during the drag.`,
    })
    .not.toBe(valueBefore);
  await expect
    .poll(() => readCanvasPixelSum(page), {
      message: `Product output for "${target}" must update live during the drag.`,
    })
    .not.toBe(pixelsBefore);
  await page.mouse.up();
}

export function applicabilityCasesFor(
  target: string,
): ToolcraftControlApplicabilityCase[] {
  return getToolcraftControlApplicabilityCases({
    schema: appSchema,
    sectionInventory: appControlSectionInventory,
    target,
  });
}

export function caseRequirementId(
  baseRequirementId: string,
  applicabilityCase: ToolcraftControlApplicabilityCase,
): string {
  return getToolcraftApplicabilityRequirementId(
    baseRequirementId,
    applicabilityCase,
  );
}

function findSchemaControl(target: string) {
  for (const section of appSchema.panels.controls?.sections ?? []) {
    for (const control of Object.values(section.controls)) {
      if (control.target === target) return control;
    }
  }
  return undefined;
}

/** Applies one selector value through the real UI, by control type. */
async function applyControlValue(
  page: Page,
  target: string,
  value: unknown,
): Promise<void> {
  const control = findSchemaControl(target);
  if (!control) {
    throw new Error(`No schema control owns applicability target "${target}".`);
  }
  if (control.type === "tabs" || control.type === "select") {
    const label = control.options?.find(
      (option) => option.value === value,
    )?.label;
    if (!label) {
      throw new Error(
        `Control "${target}" has no option for value "${String(value)}".`,
      );
    }
    if (control.type === "tabs") {
      const field = await getToolcraftControlFieldByTarget(page, target);
      await field.getByRole("tab", { exact: true, name: label }).click();
      return;
    }
    await selectOptionByTarget(page, target, label);
    return;
  }
  if (control.type === "switch" || control.type === "checkbox") {
    await setSwitchByTarget(page, target, value === true);
    return;
  }
  throw new Error(
    `Unsupported applicability selector control type "${control.type}".`,
  );
}

/**
 * Builds the target-scoped branch action for one applicability case.
 * Cases are derived against the dependent control's satisfying baseline
 * (every predicate met), varying one selector; the action therefore
 * first establishes that baseline through the real UI, then applies the
 * case's own selector value.
 */
export function makeBranchAction(
  session: ToolcraftBrowserProofSession,
  applicabilityCase: ToolcraftControlApplicabilityCase,
): ToolcraftBrowserAction {
  return session.targetAction(
    applicabilityCase.selectorTarget,
    async (page) => {
      const dependent = findSchemaControl(applicabilityCase.target);
      for (const predicate of getToolcraftApplicabilityPredicates(
        dependent?.applicability,
      )) {
        if (predicate.target === applicabilityCase.selectorTarget) continue;
        if ("equals" in predicate) {
          await applyControlValue(page, predicate.target, predicate.equals);
        }
      }
      await applyControlValue(
        page,
        applicabilityCase.selectorTarget,
        applicabilityCase.selectorValue,
      );
    },
  );
}

/**
 * Proves one visible applicability case for a slider row: selects the
 * branch, proves visibility, then proves the slider still changes
 * product output in that branch with a live thumb drag.
 */
export async function proveSliderApplicabilityCases(
  session: ToolcraftBrowserProofSession,
  page: Page,
  options: Readonly<{
    dragRatios?: readonly number[];
    rowId: string;
    target: string;
  }>,
): Promise<void> {
  const cases = applicabilityCasesFor(options.target);
  const ratios = options.dragRatios ?? [0.9, 0.1];
  let ratioIndex = 0;
  for (const applicabilityCase of cases) {
    const branch = makeBranchAction(session, applicabilityCase);
    await expectToolcraftControlApplicabilityState(session, branch, applicabilityCase, {
      baseRequirementId: options.rowId,
    });
    if (applicabilityCase.expectation !== "visible") continue;
    const ratio = ratios[ratioIndex % ratios.length]!;
    ratioIndex += 1;
    const drag = session.controlAction(options.target, (_control, currentPage) =>
      dragSliderWithLiveProductUpdate(currentPage, options.target, ratio),
    );
    await expectToolcraftProductObservableToChange(session, drag, {
      requirementId: caseRequirementId(options.rowId, applicabilityCase),
      selector: EPHEMERA_CANVAS_SELECTOR,
    });
  }
}

export async function exportImageDownload(page: Page): Promise<Download> {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    clickToolcraftPanelActionByLabel(page, "Export PNG"),
  ]);
  await download.path();
  return download;
}

export function getFiniteImageExportSize(resolution: "2k" | "4k" | "8k"): {
  height: number;
  width: number;
} {
  const longEdge = { "2k": 2048, "4k": 4096, "8k": 8192 }[resolution];
  const { height, width } = appSchema.canvas.size;
  const ratio = longEdge / Math.max(width, height);
  return width >= height
    ? { height: Math.max(1, Math.round(height * ratio)), width: longEdge }
    : { height: longEdge, width: Math.max(1, Math.round(width * ratio)) };
}

export const EPHEMERA_PAPER_RGBA = [0xf4, 0xf0, 0xe6, 255] as const;
export const EPHEMERA_DEFAULT_BACKGROUND = EPHEMERA_DEFAULTS.background;
