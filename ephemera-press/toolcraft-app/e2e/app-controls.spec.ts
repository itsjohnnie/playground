import { expect, test } from "./toolcraft-product-test";

test("browser: ephemera press opens with the sheet artboard and product sections", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator('[data-slot="toolcraft-runtime-app"]')).toBeVisible();
  await expect(
    page.getByRole("application", { name: "Canvas viewport" }),
  ).toBeVisible();
  await expect(page.locator("[data-toolcraft-product-output]")).toBeVisible();

  await expect(page.getByText("Piece", { exact: true })).toBeVisible();
  await expect(page.getByText("Inks", { exact: true })).toBeVisible();
  await expect(page.getByText("Verse", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { exact: true, name: "Export PNG" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Play playback|Pause playback/ }),
  ).toHaveCount(0);
});
