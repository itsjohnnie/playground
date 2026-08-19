import { expect, test } from "./toolcraft-product-test";

import { expectToolcraftControlApplicabilityState } from "./browser-control-applicability-evidence";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import {
  applicabilityCasesFor,
  caseRequirementId,
  engineCounts,
  EPHEMERA_CANVAS_SELECTOR,
  makeBranchAction,
  openEphemeraSession,
  proveSliderApplicabilityCases,
  readPieceCounts,
  selectOptionByTarget,
  selectPieceTab,
  setSwitchByTarget,
} from "./product-support";

test.setTimeout(240_000);

test("browser: wheel instrument select redraws the face", async ({ page }) => {
  const session = await openEphemeraSession(page);
  await selectPieceTab(page, "Wheel");
  await expect.poll(async () => (await readPieceCounts(page)).mode).toBe("wheel");

  const toKnitting = session.controlAction(
    "wheel.instrument",
    (_control, currentPage) =>
      selectOptionByTarget(currentPage, "wheel.instrument", "Knitting"),
  );
  await expectToolcraftProductObservableToChange(session, toKnitting, {
    requirementId: "wheel.instrument",
    selector: EPHEMERA_CANVAS_SELECTOR,
  });
  await expect
    .poll(async () => (await readPieceCounts(page)).texts)
    .toBe(engineCounts("wheel", { wheelInstrument: "knitting" }).texts);

  for (const [label, value] of [
    ["Dose", "dose"],
    ["Dial", "dial"],
    ["Gauge", "gauge"],
  ] as const) {
    await selectOptionByTarget(page, "wheel.instrument", label);
    await expect
      .poll(async () => (await readPieceCounts(page)).texts)
      .toBe(engineCounts("wheel", { wheelInstrument: value }).texts);
  }
});

test("browser: wheel divisions slider re-ticks the scales live", async ({
  page,
}) => {
  const session = await openEphemeraSession(page);
  await proveSliderApplicabilityCases(session, page, {
    rowId: "wheel.divisions",
    target: "wheel.divisions",
  });
});

test("browser: wheel rings slider adds scales live", async ({ page }) => {
  const session = await openEphemeraSession(page);
  await proveSliderApplicabilityCases(session, page, {
    rowId: "wheel.rings",
    target: "wheel.rings",
  });
});

test("browser: wheel notches toggle cuts the rim", async ({ page }) => {
  const session = await openEphemeraSession(page);

  for (const applicabilityCase of applicabilityCasesFor("wheel.notches")) {
    const branch = makeBranchAction(session, applicabilityCase);
    await expectToolcraftControlApplicabilityState(
      session,
      branch,
      applicabilityCase,
      { baseRequirementId: "wheel.notches" },
    );
    if (applicabilityCase.expectation !== "visible") continue;

    const before = await readPieceCounts(page);
    const toggleOff = session.controlAction(
      "wheel.notches",
      (_control, currentPage) =>
        setSwitchByTarget(currentPage, "wheel.notches", false),
    );
    await expectToolcraftProductObservableToChange(session, toggleOff, {
      requirementId: caseRequirementId("wheel.notches", applicabilityCase),
      selector: EPHEMERA_CANVAS_SELECTOR,
    });
    const after = await readPieceCounts(page);
    expect(after.marks).toBeLessThan(before.marks);
    await setSwitchByTarget(page, "wheel.notches", true);
  }
});
