import { test } from "./toolcraft-product-test";

import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import {
  EPHEMERA_CANVAS_SELECTOR,
  openEphemeraSession,
  selectOptionByTarget,
  setColorByLabel,
} from "./product-support";

test.setTimeout(120_000);

test("browser: ink color repaints the composition", async ({ page }) => {
  const session = await openEphemeraSession(page);
  const recolor = session.controlAction("ink.primary", (_control, currentPage) =>
    setColorByLabel(currentPage, "Ink", "#0f2d52"),
  );
  await expectToolcraftProductObservableToChange(session, recolor, {
    requirementId: "ink.primary",
    selector: EPHEMERA_CANVAS_SELECTOR,
  });
});

test("browser: accent color repaints the second ink", async ({ page }) => {
  const session = await openEphemeraSession(page);
  // The rain arrangement prints accent line numbers, so the accent ink
  // is visible in the fixture before it changes.
  await selectOptionByTarget(page, "poem.arrangement", "Rain");
  const recolor = session.controlAction("ink.accent", (_control, currentPage) =>
    setColorByLabel(currentPage, "Accent", "#0a8f6a"),
  );
  await expectToolcraftProductObservableToChange(session, recolor, {
    requirementId: "ink.accent",
    selector: EPHEMERA_CANVAS_SELECTOR,
  });
});
