import { expect, test } from "@playwright/test";
import { registerAndOnboard, t } from "./helpers";

test("an unknown content id renders the localized 404 inside the app shell", async ({ page }) => {
  await registerAndOnboard(page, "toeic");

  await page.goto("/reading/this-id-does-not-exist");

  // The (app) not-found boundary, localized — not Next's default 404.
  await expect(page.getByRole("heading", { name: t.errors.notFoundTitle })).toBeVisible();
  await expect(page.getByRole("link", { name: t.errors.goHome })).toBeVisible();
});
