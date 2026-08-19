import { expect, test } from "./toolcraft-product-test";

import { expectToolcraftAcceptanceOutcome } from "./browser-acceptance-outcome-helpers";
import { expectToolcraftImageExportArtifact } from "./browser-media-export-evidence";
import {
  computePiece,
} from "../src/app/ephemera/engine";
import {
  baseEngineParams,
  EPHEMERA_PAPER_RGBA,
  getFiniteImageExportSize,
  openEphemeraSession,
  readPieceCounts,
  selectOptionByTarget,
  selectPieceTab,
} from "./product-support";

const ACCENT_RGBA = [0xc2, 0x40, 0x1f, 255] as const;

test.setTimeout(240_000);

test("browser: Export PNG downloads the composed piece", async ({ page }) => {
  const session = await openEphemeraSession(page);

  // Solid fixture: the knitting stitch gauge renders a thick accent
  // band (an exactly predictable solid pixel on the sheet's horizontal
  // midline) and chunky rim notches whose outer ends set the decoded
  // non-background bounds; hairline-only geometry stays inside them.
  await selectPieceTab(page, "Wheel");
  await selectOptionByTarget(page, "wheel.instrument", "Knitting");
  const fixtureParams = baseEngineParams({
    mode: "wheel",
    wheelInstrument: "knitting",
  });
  const fixture = computePiece(fixtureParams);
  await expect
    .poll(async () => (await readPieceCounts(page)).marks)
    .toBe(fixture.marks);

  // The rim notches (bold radial lines at top/right/bottom/left) are
  // the outermost decodable geometry; derive expected bounds from the
  // line ops in the engine model.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const op of fixture.ops) {
    if (op.kind === "line") {
      minX = Math.min(minX, op.x1 - op.width, op.x2 - op.width);
      maxX = Math.max(maxX, op.x1 + op.width, op.x2 + op.width);
      minY = Math.min(minY, op.y1 - op.width, op.y2 - op.width);
      maxY = Math.max(maxY, op.y1 + op.width, op.y2 + op.width);
    }
  }
  const expectedBounds = {
    height: (maxY - minY) / fixtureParams.H,
    width: (maxX - minX) / fixtureParams.W,
    x: minX / fixtureParams.W,
    y: minY / fixtureParams.H,
  };
  // A point on the accent band's horizontal midline: the full decoded
  // observation cell there sits inside the solid band annulus.
  const sheetU = Math.min(fixtureParams.W, fixtureParams.H);
  const bandXRatio =
    (fixtureParams.W / 2 + sheetU * 0.4 * 0.66) / fixtureParams.W;
  const expectedSize = getFiniteImageExportSize("4k");

  const produce = session.targetAction("actions.output", async (currentPage) => {
    const [download] = await Promise.all([
      currentPage.waitForEvent("download"),
      currentPage
        .getByRole("button", { exact: true, name: "Export PNG" })
        .click(),
    ]);
    await download.path();
    return download;
  });

  await expectToolcraftImageExportArtifact(produce, {
    backgroundRgba: EPHEMERA_PAPER_RGBA,
    expectedBounds,
    expectedHeight: expectedSize.height,
    expectedMediaType: "image/png",
    expectedPixels: [
      { rgba: ACCENT_RGBA, xRatio: bandXRatio, yRatio: 0.5 },
      { rgba: EPHEMERA_PAPER_RGBA, xRatio: 0.03, yRatio: 0.03 },
    ],
    expectedWidth: expectedSize.width,
    page,
    requirementId: "actions.output",
  });
});

test("browser: copy svg places the piece markup on the clipboard", async ({
  page,
}) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await openEphemeraSession(page);
  await expectToolcraftAcceptanceOutcome(
    async () =>
      page.evaluate(async () => {
        try {
          const text = await navigator.clipboard.readText();
          return text.slice(0, 64);
        } catch {
          return "";
        }
      }),
    async () => {
      await page
        .getByRole("button", { exact: true, name: "Copy SVG" })
        .click();
    },
    {
      evidenceType: "command-side-effect",
      requirementId: "actions.copy-svg",
    },
  );
  const payload = await page.evaluate(() => navigator.clipboard.readText());
  expect(payload.startsWith("<svg ")).toBe(true);
  expect(payload.endsWith("</svg>")).toBe(true);
  expect(payload).toContain("harbour");
  expect(payload).toContain('width="1080"');
});
