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
  // band (an exactly predictable solid pixel at the band's top, where
  // no lettering or punched holes sit) plus a solid banner box whose
  // corners set the widest decoded non-background bounds.
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

  // Derive expected bounds from every solid primitive in the engine
  // model: the dark banner box (which reaches past the rim), the band
  // circle stroke, the punched holes, and the tick lines.
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
    } else if (op.kind === "box") {
      minX = Math.min(minX, op.x);
      maxX = Math.max(maxX, op.x + op.w);
      minY = Math.min(minY, op.y);
      maxY = Math.max(maxY, op.y + op.h);
    } else if (op.kind === "circle") {
      minX = Math.min(minX, op.x - op.r - op.width / 2);
      maxX = Math.max(maxX, op.x + op.r + op.width / 2);
      minY = Math.min(minY, op.y - op.r - op.width / 2);
      maxY = Math.max(maxY, op.y + op.r + op.width / 2);
    } else if (op.kind === "dot") {
      minX = Math.min(minX, op.x - op.r);
      maxX = Math.max(maxX, op.x + op.r);
      minY = Math.min(minY, op.y - op.r);
      maxY = Math.max(maxY, op.y + op.r);
    }
  }
  const expectedBounds = {
    height: (maxY - minY) / fixtureParams.H,
    width: (maxX - minX) / fixtureParams.W,
    x: minX / fixtureParams.W,
    y: minY / fixtureParams.H,
  };
  // A point at the top of the accent band: the banner box covers the
  // horizontal midline, so probe vertically where the full decoded
  // observation cell sits inside the solid band annulus.
  const sheetU = Math.min(fixtureParams.W, fixtureParams.H);
  const bandMidRadius = sheetU * 0.41 * 0.935;
  const bandYRatio = (fixtureParams.H / 2 - bandMidRadius) / fixtureParams.H;
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
      { rgba: ACCENT_RGBA, xRatio: 0.5, yRatio: bandYRatio },
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
