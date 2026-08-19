import { expect, test } from "./toolcraft-product-test";

import { expectToolcraftControlApplicabilityState } from "./browser-control-applicability-evidence";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import {
  applicabilityCasesFor,
  caseRequirementId,
  dragSliderWithLiveProductUpdate,
  engineCounts,
  EPHEMERA_CANVAS_SELECTOR,
  makeBranchAction,
  openEphemeraSession,
  readPieceCounts,
  selectPieceTab,
} from "./product-support";

test.setTimeout(180_000);

const MODE_TABS = [
  ["Rings", "rings"],
  ["Tour", "tour"],
  ["Sheet", "sheet"],
  ["Wheel", "wheel"],
  ["Poem", "poem"],
] as const;

test("browser: piece mode tabs switch poem, rings, tour, sheet, and wheel output", async ({
  page,
}) => {
  const session = await openEphemeraSession(page);

  expect(await readPieceCounts(page)).toMatchObject(engineCounts("poem"));

  const switchToRings = session.controlAction("piece.mode", (_control, currentPage) =>
    selectPieceTab(currentPage, "Rings"),
  );
  await expectToolcraftProductObservableToChange(session, switchToRings, {
    requirementId: "piece.mode",
    selector: EPHEMERA_CANVAS_SELECTOR,
  });
  expect(await readPieceCounts(page)).toMatchObject(engineCounts("rings"));

  for (const [label, mode] of MODE_TABS.slice(1)) {
    await selectPieceTab(page, label);
    await expect
      .poll(async () => (await readPieceCounts(page)).mode)
      .toBe(mode);
    expect(await readPieceCounts(page)).toMatchObject(
      engineCounts(mode),
    );
  }
});

test("browser: seed slider recomposes the piece in every mode", async ({
  page,
}) => {
  const session = await openEphemeraSession(page);

  // Alternate drag targets so consecutive visible branches never land
  // on the same seed value (which would make the value assert vacuous).
  const ratios = [0.75, 0.15, 0.9, 0.35, 0.55];
  let visibleIndex = 0;
  for (const applicabilityCase of applicabilityCasesFor("piece.seed")) {
    const branch = makeBranchAction(session, applicabilityCase);
    await expectToolcraftControlApplicabilityState(
      session,
      branch,
      applicabilityCase,
      { baseRequirementId: "piece.seed" },
    );
    if (applicabilityCase.expectation !== "visible") continue;

    const ratio = ratios[visibleIndex % ratios.length]!;
    visibleIndex += 1;
    const drag = session.controlAction("piece.seed", (_control, currentPage) =>
      dragSliderWithLiveProductUpdate(currentPage, "piece.seed", ratio),
    );
    await expectToolcraftProductObservableToChange(session, drag, {
      requirementId: caseRequirementId("piece.seed", applicabilityCase),
      selector: EPHEMERA_CANVAS_SELECTOR,
    });
  }
});
