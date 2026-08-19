import { expect, test } from "./toolcraft-product-test";

import { expectToolcraftControlApplicabilityState } from "./browser-control-applicability-evidence";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import {
  applicabilityCasesFor,
  caseRequirementId,
  engineCounts,
  EPHEMERA_CANVAS_SELECTOR,
  fillCodeByTarget,
  makeBranchAction,
  openEphemeraSession,
  proveSliderApplicabilityCases,
  readPieceCounts,
  selectOptionByTarget,
} from "./product-support";

test.setTimeout(240_000);

test("browser: poem text edits recompose the scatter live", async ({ page }) => {
  const session = await openEphemeraSession(page);

  for (const applicabilityCase of applicabilityCasesFor("poem.text")) {
    const branch = makeBranchAction(session, applicabilityCase);
    await expectToolcraftControlApplicabilityState(
      session,
      branch,
      applicabilityCase,
      { baseRequirementId: "poem.text" },
    );
    if (applicabilityCase.expectation !== "visible") continue;

    const retype = session.controlAction("poem.text", (_control, currentPage) =>
      fillCodeByTarget(currentPage, "poem.text", "one lantern\ntwo tides\nthree doors"),
    );
    await expectToolcraftProductObservableToChange(session, retype, {
      requirementId: caseRequirementId("poem.text", applicabilityCase),
      selector: EPHEMERA_CANVAS_SELECTOR,
    });
    const expected = engineCounts("poem", {
      poemText: "one lantern\ntwo tides\nthree doors",
    });
    await expect
      .poll(async () => (await readPieceCounts(page)).texts)
      .toBe(expected.texts);
  }
});

test("browser: poem arrangement select recomposes the scatter", async ({
  page,
}) => {
  const session = await openEphemeraSession(page);

  const toRain = session.controlAction("poem.arrangement", (_control, currentPage) =>
    selectOptionByTarget(currentPage, "poem.arrangement", "Rain"),
  );
  await expectToolcraftProductObservableToChange(session, toRain, {
    requirementId: "poem.arrangement",
    selector: EPHEMERA_CANVAS_SELECTOR,
  });
  await expect
    .poll(async () => (await readPieceCounts(page)).texts)
    .toBe(engineCounts("poem", { poemArrangement: "rain" }).texts);

  for (const [label, value] of [
    ["Gaps", "gaps"],
    ["Constellation", "constellation"],
    ["Drift", "drift"],
  ] as const) {
    await selectOptionByTarget(page, "poem.arrangement", label);
    await expect
      .poll(async () => (await readPieceCounts(page)).texts)
      .toBe(engineCounts("poem", { poemArrangement: value }).texts);
  }
});

test("browser: poem spread slider scatters the words live", async ({ page }) => {
  const session = await openEphemeraSession(page);
  await proveSliderApplicabilityCases(session, page, {
    rowId: "poem.spread",
    target: "poem.spread",
  });
});

test("browser: poem leading slider respaces the lines live", async ({
  page,
}) => {
  const session = await openEphemeraSession(page);
  await proveSliderApplicabilityCases(session, page, {
    rowId: "poem.leading",
    target: "poem.leading",
  });
});

test("browser: poem type size slider rescales the words live", async ({
  page,
}) => {
  const session = await openEphemeraSession(page);
  await proveSliderApplicabilityCases(session, page, {
    rowId: "poem.type-size",
    target: "poem.scale",
  });
});
