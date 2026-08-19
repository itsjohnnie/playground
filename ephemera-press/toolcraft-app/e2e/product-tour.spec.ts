import { expect, test } from "./toolcraft-product-test";

import { expectToolcraftControlApplicabilityState } from "./browser-control-applicability-evidence";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import {
  applicabilityCasesFor,
  caseRequirementId,
  engineCounts,
  EPHEMERA_CANVAS_SELECTOR,
  fillCodeByTarget,
  fillTextByTarget,
  makeBranchAction,
  openEphemeraSession,
  proveSliderApplicabilityCases,
  readPieceCounts,
  selectOptionByTarget,
  selectPieceTab,
} from "./product-support";

test.setTimeout(240_000);

test("browser: tour artist edits reset the billing live", async ({ page }) => {
  const session = await openEphemeraSession(page);

  for (const applicabilityCase of applicabilityCasesFor("tour.artist")) {
    const branch = makeBranchAction(session, applicabilityCase);
    await expectToolcraftControlApplicabilityState(
      session,
      branch,
      applicabilityCase,
      { baseRequirementId: "tour.artist" },
    );
    if (applicabilityCase.expectation !== "visible") continue;

    const retype = session.controlAction("tour.artist", (_control, currentPage) =>
      fillTextByTarget(currentPage, "tour.artist", "NOVA TIDE"),
    );
    await expectToolcraftProductObservableToChange(session, retype, {
      requirementId: caseRequirementId("tour.artist", applicabilityCase),
      selector: EPHEMERA_CANVAS_SELECTOR,
    });
  }
});

test("browser: tour dates edits recompose the bill live", async ({ page }) => {
  const session = await openEphemeraSession(page);

  for (const applicabilityCase of applicabilityCasesFor("tour.dates")) {
    const branch = makeBranchAction(session, applicabilityCase);
    await expectToolcraftControlApplicabilityState(
      session,
      branch,
      applicabilityCase,
      { baseRequirementId: "tour.dates" },
    );
    if (applicabilityCase.expectation !== "visible") continue;

    const shortBill = "9/1  Lisbon, Portugal  Jardim\n9/2  Porto, Portugal  Casa";
    const retype = session.controlAction("tour.dates", (_control, currentPage) =>
      fillCodeByTarget(currentPage, "tour.dates", shortBill),
    );
    await expectToolcraftProductObservableToChange(session, retype, {
      requirementId: caseRequirementId("tour.dates", applicabilityCase),
      selector: EPHEMERA_CANVAS_SELECTOR,
    });
    const expected = engineCounts("tour", { tourDates: shortBill });
    await expect
      .poll(async () => (await readPieceCounts(page)).texts)
      .toBe(expected.texts);
  }
});

test("browser: tour layout select recomposes the bill", async ({ page }) => {
  const session = await openEphemeraSession(page);
  await selectPieceTab(page, "Tour");
  await expect.poll(async () => (await readPieceCounts(page)).mode).toBe("tour");

  const toOrbit = session.controlAction("tour.layout", (_control, currentPage) =>
    selectOptionByTarget(currentPage, "tour.layout", "Orbit"),
  );
  await expectToolcraftProductObservableToChange(session, toOrbit, {
    requirementId: "tour.layout",
    selector: EPHEMERA_CANVAS_SELECTOR,
  });
  await expect
    .poll(async () => (await readPieceCounts(page)).texts)
    .toBe(engineCounts("tour", { tourLayout: "orbit" }).texts);

  for (const [label, value] of [
    ["Ledger", "ledger"],
    ["Diagonal", "diagonal"],
  ] as const) {
    await selectOptionByTarget(page, "tour.layout", label);
    await expect
      .poll(async () => (await readPieceCounts(page)).texts)
      .toBe(engineCounts("tour", { tourLayout: value }).texts);
  }
});

test("browser: tour leading slider respaces the bill live", async ({
  page,
}) => {
  const session = await openEphemeraSession(page);
  await proveSliderApplicabilityCases(session, page, {
    rowId: "tour.leading",
    target: "tour.leading",
  });
});
