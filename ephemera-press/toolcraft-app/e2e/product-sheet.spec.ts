import { expect, test } from "./toolcraft-product-test";

import { expectToolcraftControlApplicabilityState } from "./browser-control-applicability-evidence";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import {
  applicabilityCasesFor,
  caseRequirementId,
  engineCounts,
  EPHEMERA_CANVAS_SELECTOR,
  fillTextByTarget,
  makeBranchAction,
  openEphemeraSession,
  proveSliderApplicabilityCases,
  readPieceCounts,
  selectOptionByTarget,
  selectPieceTab,
} from "./product-support";

test.setTimeout(240_000);

test("browser: sheet words edits refill the grid live", async ({ page }) => {
  const session = await openEphemeraSession(page);

  for (const applicabilityCase of applicabilityCasesFor("sheet.words")) {
    const branch = makeBranchAction(session, applicabilityCase);
    await expectToolcraftControlApplicabilityState(
      session,
      branch,
      applicabilityCase,
      { baseRequirementId: "sheet.words" },
    );
    if (applicabilityCase.expectation !== "visible") continue;

    const retype = session.controlAction("sheet.words", (_control, currentPage) =>
      fillTextByTarget(currentPage, "sheet.words", "RAIN CHORUS"),
    );
    await expectToolcraftProductObservableToChange(session, retype, {
      requirementId: caseRequirementId("sheet.words", applicabilityCase),
      selector: EPHEMERA_CANVAS_SELECTOR,
    });
  }
});

test("browser: sheet pattern select refills the grid", async ({ page }) => {
  const session = await openEphemeraSession(page);
  await selectPieceTab(page, "Sheet");
  await expect.poll(async () => (await readPieceCounts(page)).mode).toBe("sheet");

  const toLedger = session.controlAction("sheet.pattern", (_control, currentPage) =>
    selectOptionByTarget(currentPage, "sheet.pattern", "Ledger"),
  );
  await expectToolcraftProductObservableToChange(session, toLedger, {
    requirementId: "sheet.pattern",
    selector: EPHEMERA_CANVAS_SELECTOR,
  });
  await expect
    .poll(async () => (await readPieceCounts(page)).texts)
    .toBe(engineCounts("sheet", { sheetPattern: "ledger" }).texts);

  for (const [label, value] of [
    ["Patches", "patches"],
    ["Weave", "weave"],
  ] as const) {
    await selectOptionByTarget(page, "sheet.pattern", label);
    await expect
      .poll(async () => (await readPieceCounts(page)).texts)
      .toBe(engineCounts("sheet", { sheetPattern: value }).texts);
  }
});

test("browser: sheet cell slider retiles the grid live", async ({ page }) => {
  const session = await openEphemeraSession(page);
  await proveSliderApplicabilityCases(session, page, {
    dragRatios: [0.1, 0.9],
    rowId: "sheet.cell",
    target: "sheet.cell",
  });
});

test("browser: sheet void slider empties slots live", async ({ page }) => {
  const session = await openEphemeraSession(page);
  await proveSliderApplicabilityCases(session, page, {
    rowId: "sheet.void",
    target: "sheet.void",
  });
});

test("browser: sheet emphasis slider reweights words live", async ({
  page,
}) => {
  const session = await openEphemeraSession(page);
  await proveSliderApplicabilityCases(session, page, {
    rowId: "sheet.emphasis",
    target: "sheet.emphasis",
  });
});
