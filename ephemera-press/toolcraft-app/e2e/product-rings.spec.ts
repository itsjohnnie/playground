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
  setSwitchByTarget,
} from "./product-support";

test.setTimeout(240_000);

test("browser: ring style select recomposes the rings", async ({ page }) => {
  const session = await openEphemeraSession(page);
  await selectPieceTab(page, "Rings");
  await expect.poll(async () => (await readPieceCounts(page)).mode).toBe("rings");

  const toStitched = session.controlAction("rings.style", (_control, currentPage) =>
    selectOptionByTarget(currentPage, "rings.style", "Stitched"),
  );
  await expectToolcraftProductObservableToChange(session, toStitched, {
    requirementId: "rings.style",
    selector: EPHEMERA_CANVAS_SELECTOR,
  });
  await expect
    .poll(async () => (await readPieceCounts(page)).marks)
    .toBe(engineCounts("rings", { ringStyle: "stitched" }).marks);

  for (const [label, value] of [
    ["Orbits", "orbits"],
    ["Typewriter", "typewriter"],
  ] as const) {
    await selectOptionByTarget(page, "rings.style", label);
    await expect
      .poll(async () => (await readPieceCounts(page)).marks)
      .toBe(engineCounts("rings", { ringStyle: value }).marks);
  }
});

test("browser: ring words edits reset the circled text live", async ({
  page,
}) => {
  const session = await openEphemeraSession(page);

  for (const applicabilityCase of applicabilityCasesFor("rings.words")) {
    const branch = makeBranchAction(session, applicabilityCase);
    await expectToolcraftControlApplicabilityState(
      session,
      branch,
      applicabilityCase,
      { baseRequirementId: "rings.words" },
    );
    if (applicabilityCase.expectation !== "visible") continue;

    const retype = session.controlAction("rings.words", (_control, currentPage) =>
      fillTextByTarget(currentPage, "rings.words", "EVERY TURN RETURNS"),
    );
    await expectToolcraftProductObservableToChange(session, retype, {
      requirementId: caseRequirementId("rings.words", applicabilityCase),
      selector: EPHEMERA_CANVAS_SELECTOR,
    });
  }
});

test("browser: ring count slider adds rings live", async ({ page }) => {
  const session = await openEphemeraSession(page);
  await proveSliderApplicabilityCases(session, page, {
    rowId: "rings.count",
    target: "rings.count",
  });
});

test("browser: ring size slider rescales the rings live", async ({ page }) => {
  const session = await openEphemeraSession(page);
  await proveSliderApplicabilityCases(session, page, {
    rowId: "rings.size",
    target: "rings.size",
  });
});

test("browser: ring gather slider overlaps the rings live", async ({
  page,
}) => {
  const session = await openEphemeraSession(page);
  await proveSliderApplicabilityCases(session, page, {
    rowId: "rings.gather",
    target: "rings.gather",
  });
});

test("browser: ring marks toggle stitches the crossings", async ({ page }) => {
  const session = await openEphemeraSession(page);

  for (const applicabilityCase of applicabilityCasesFor("rings.marks")) {
    const branch = makeBranchAction(session, applicabilityCase);
    await expectToolcraftControlApplicabilityState(
      session,
      branch,
      applicabilityCase,
      { baseRequirementId: "rings.marks" },
    );
    if (applicabilityCase.expectation !== "visible") continue;

    const before = await readPieceCounts(page);
    const toggleOff = session.controlAction("rings.marks", (_control, currentPage) =>
      setSwitchByTarget(currentPage, "rings.marks", false),
    );
    await expectToolcraftProductObservableToChange(session, toggleOff, {
      requirementId: caseRequirementId("rings.marks", applicabilityCase),
      selector: EPHEMERA_CANVAS_SELECTOR,
    });
    const after = await readPieceCounts(page);
    expect(after.marks).toBeLessThan(before.marks);
    await setSwitchByTarget(page, "rings.marks", true);
  }
});
