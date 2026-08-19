import { expect, test } from "./toolcraft-product-test";

import { expectToolcraftExportedArtifact } from "./browser-acceptance-outcome-helpers";
import { expectToolcraftControlApplicabilityState } from "./browser-control-applicability-evidence";
import { inspectToolcraftImageDownload } from "./image-artifact-inspection";
import {
  applicabilityCasesFor,
  caseRequirementId,
  exportImageDownload,
  getFiniteImageExportSize,
  makeBranchAction,
  openEphemeraSession,
  selectOptionByTarget,
} from "./product-support";

const BACKGROUND_RGBA = [0xf4, 0xf0, 0xe6, 255] as const;

test.setTimeout(240_000);

test("browser: image format select changes the exported file type", async ({
  page,
}) => {
  const session = await openEphemeraSession(page);
  const formats = ["jpg", "png", "jpg"] as const;
  let caseIndex = 0;

  for (const applicabilityCase of applicabilityCasesFor(
    "export.image.format",
  )) {
    const branch = makeBranchAction(session, applicabilityCase);
    await expectToolcraftControlApplicabilityState(
      session,
      branch,
      applicabilityCase,
      { baseRequirementId: "export.image-format" },
    );
    if (applicabilityCase.expectation !== "visible") continue;

    const format = formats[caseIndex % formats.length]!;
    caseIndex += 1;
    const resolution = String(applicabilityCase.selectorValue) as
      | "2k"
      | "4k"
      | "8k";
    await selectOptionByTarget(
      page,
      "export.image.format",
      format.toUpperCase(),
    );
    const expectedSize = getFiniteImageExportSize(resolution);

    const produce = session.targetAction("export.image.format", (currentPage) =>
      exportImageDownload(currentPage),
    );
    await expectToolcraftExportedArtifact(
      produce,
      async (download) => {
        const inspected = await inspectToolcraftImageDownload({
          backgroundRgba: BACKGROUND_RGBA,
          download,
          page,
        });
        expect(inspected.inspection.mediaType).toBe(
          format === "jpg" ? "image/jpeg" : "image/png",
        );
        expect(inspected.inspection.width).toBe(expectedSize.width);
        expect(inspected.inspection.height).toBe(expectedSize.height);
        return inspected.inspection;
      },
      {
        requirementId: caseRequirementId(
          "export.image-format",
          applicabilityCase,
        ),
      },
    );
  }
});

test("browser: image resolution select changes exported dimensions", async ({
  page,
}) => {
  const session = await openEphemeraSession(page);
  const resolutions = ["2k", "8k"] as const;
  let caseIndex = 0;

  for (const applicabilityCase of applicabilityCasesFor(
    "export.image.resolution",
  )) {
    const branch = makeBranchAction(session, applicabilityCase);
    await expectToolcraftControlApplicabilityState(
      session,
      branch,
      applicabilityCase,
      { baseRequirementId: "export.image-resolution" },
    );
    if (applicabilityCase.expectation !== "visible") continue;

    const resolution = resolutions[caseIndex % resolutions.length]!;
    caseIndex += 1;
    const format = String(applicabilityCase.selectorValue);
    await selectOptionByTarget(
      page,
      "export.image.resolution",
      resolution.toUpperCase(),
    );
    const expectedSize = getFiniteImageExportSize(resolution);

    const produce = session.targetAction(
      "export.image.resolution",
      (currentPage) => exportImageDownload(currentPage),
    );
    await expectToolcraftExportedArtifact(
      produce,
      async (download) => {
        const inspected = await inspectToolcraftImageDownload({
          backgroundRgba: BACKGROUND_RGBA,
          download,
          page,
        });
        expect(inspected.inspection.mediaType).toBe(
          format === "jpg" ? "image/jpeg" : "image/png",
        );
        expect(inspected.inspection.width).toBe(expectedSize.width);
        expect(inspected.inspection.height).toBe(expectedSize.height);
        return inspected.inspection;
      },
      {
        requirementId: caseRequirementId(
          "export.image-resolution",
          applicabilityCase,
        ),
      },
    );
  }
});
