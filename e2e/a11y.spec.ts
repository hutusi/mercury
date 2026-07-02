import { expect, test } from "@playwright/test";
import { registerAndOnboard, t } from "./helpers";

test("skip link appears on first Tab and jumps to the main content", async ({ page }) => {
  await registerAndOnboard(page);

  // The skip link is sr-only until keyboard focus reveals it.
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: t.a11y.skipToContent });
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
  await expect(page.locator("main#main-content")).toBeVisible();
});
