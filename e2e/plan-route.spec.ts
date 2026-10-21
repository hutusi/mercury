import { expect, test } from "@playwright/test";
import { registerAndOnboard, t } from "./helpers";

// Today's route is a persisted snapshot (ADR 0033): skipping a stop moves
// "current" to the next one, survives a reload, and leaves the skipped stop
// one tap from coming back.
test("skipping today's current stop persists and moves the route on", async ({ page }) => {
  await registerAndOnboard(page, "toeic");

  const current = page.locator("a[data-current-stop]");
  await expect(current).toBeVisible();
  const firstHref = await current.getAttribute("href");

  await page.getByRole("button", { name: t.today.skip }).click();
  await expect(page.getByText(t.today.skippedToast.replace("{i}", "1"))).toBeVisible();
  // The next stop is current now; the skipped one says how to come back.
  await expect(current).not.toHaveAttribute("href", firstHref ?? "");
  await expect(page.getByText(t.today.skipped)).toBeVisible();

  // Persisted, not view state.
  await page.reload();
  await expect(current).not.toHaveAttribute("href", firstHref ?? "");
  await expect(page.getByText(t.today.skipped)).toBeVisible();
});
