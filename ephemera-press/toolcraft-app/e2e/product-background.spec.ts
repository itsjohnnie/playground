import { expect, test } from "./toolcraft-product-test";

import { expectToolcraftExportedArtifact } from "./browser-acceptance-outcome-helpers";
import { expectToolcraftBackgroundOutputSemantics } from "./browser-background-output-evidence";
import { expectToolcraftControlApplicabilityState } from "./browser-control-applicability-evidence";
import {
  expectToolcraftInfinityCanvasBackgroundEvidence,
  observeInfinityCanvasBackground,
} from "./browser-infinity-canvas-evidence";
import { inspectToolcraftImageDownload } from "./image-artifact-inspection";
import { getToolcraftRgbaDistance } from "./decoded-pixel-observation";
import {
  applicabilityCasesFor,
  caseRequirementId,
  EPHEMERA_DEFAULT_BACKGROUND,
  EPHEMERA_PAPER_RGBA,
  exportImageDownload,
  makeBranchAction,
  openEphemeraSession,
  readPieceCounts,
  selectOptionByTarget,
  setColorByLabel,
  setSwitchByTarget,
} from "./product-support";

test.setTimeout(240_000);

test("browser: background switch controls preview fill and PNG transparency", async ({
  page,
}) => {
  const session = await openEphemeraSession(page);
  const counts = await readPieceCounts(page);

  const observePreview = session.observe(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      "[data-toolcraft-product-output]",
    );
    const context = canvas?.getContext("2d");
    const corner = context?.getImageData(2, canvas!.height - 2, 1, 1).data;
    const backgroundVisible = Boolean(corner && corner[3]! > 0);
    return {
      backgroundVisible,
      outputSignature: `${canvas?.dataset.pieceMode}:${canvas?.dataset.pieceTexts}/${canvas?.dataset.pieceMarks}:bg=${backgroundVisible ? "on" : "off"}`,
    };
  });
  const excludeBackground = session.targetAction(
    "export.includeBackground",
    (currentPage) =>
      setSwitchByTarget(currentPage, "export.includeBackground", false),
  );
  const exportArtifact = session.targetAction(
    "export.includeBackground",
    (currentPage) => exportImageDownload(currentPage),
  );

  await expectToolcraftBackgroundOutputSemantics(
    observePreview,
    excludeBackground,
    {
      backgroundVisible: false,
      outputSignature: `poem:${counts.texts}/${counts.marks}:bg=off`,
    },
    exportArtifact,
    async (download) => {
      const inspected = await inspectToolcraftImageDownload({
        backgroundRgba: EPHEMERA_PAPER_RGBA,
        download,
        page,
      });
      const pixels = inspected.observation.normalizedPixels;
      const cornerOffset = (63 * 64 + 0) * 4;
      return {
        ...inspected.inspection,
        backgroundAlpha: pixels[cornerOffset + 3]!,
      };
    },
    { requirementId: "background.include" },
  );

  // Infinity viewport color plus the Background/Infinity dependency.
  await setSwitchByTarget(page, "export.includeBackground", true);
  await setSwitchByTarget(page, "canvas.infinity", true);
  const infinite = await observeInfinityCanvasBackground(page);
  await setSwitchByTarget(page, "export.includeBackground", false);
  const backgroundExcluded = await observeInfinityCanvasBackground(page);
  await setSwitchByTarget(page, "export.includeBackground", true);
  const backgroundRestored = await observeInfinityCanvasBackground(page);
  await expectToolcraftInfinityCanvasBackgroundEvidence(
    { backgroundExcluded, backgroundRestored, infinite },
    {
      expectedBackgroundColor: EPHEMERA_DEFAULT_BACKGROUND,
      requirementId: "background.include",
      target: "export.includeBackground",
    },
  );
});

test("browser: background color repaints the paper", async ({ page }) => {
  const session = await openEphemeraSession(page);

  for (const applicabilityCase of applicabilityCasesFor(
    "appearance.background",
  )) {
    const branch = makeBranchAction(session, applicabilityCase);
    await expectToolcraftControlApplicabilityState(
      session,
      branch,
      applicabilityCase,
      { baseRequirementId: "background.color" },
    );
    if (applicabilityCase.expectation !== "visible") continue;

    const backgroundOn = applicabilityCase.selectorValue === true;
    const expectedHex = backgroundOn ? "#123456" : "#654321";
    const expectedRgba = backgroundOn
      ? ([0x12, 0x34, 0x56, 255] as const)
      : ([0x65, 0x43, 0x21, 255] as const);
    await setColorByLabel(page, "Background color", expectedHex);
    // With Background off, PNG would be transparent; JPG stays opaque
    // and must keep the selected background color.
    await selectOptionByTarget(
      page,
      "export.image.format",
      backgroundOn ? "PNG" : "JPG",
    );

    const produce = session.targetAction(
      "appearance.background",
      (currentPage) => exportImageDownload(currentPage),
    );
    await expectToolcraftExportedArtifact(
      produce,
      async (download) => {
        const inspected = await inspectToolcraftImageDownload({
          backgroundRgba: expectedRgba,
          download,
          page,
        });
        const pixels = inspected.observation.normalizedPixels;
        const cornerOffset = (63 * 64 + 0) * 4;
        const corner = pixels.subarray(cornerOffset, cornerOffset + 4);
        expect(
          getToolcraftRgbaDistance(corner, expectedRgba),
          `Exported background pixel must match ${expectedHex} when Background is ${backgroundOn ? "on" : "off"}.`,
        ).toBeLessThanOrEqual(48);
        return inspected.inspection;
      },
      {
        requirementId: caseRequirementId(
          "background.color",
          applicabilityCase,
        ),
      },
    );
  }
});
