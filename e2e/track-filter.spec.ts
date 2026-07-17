import { expect, test } from "@playwright/test";
import { registerAndOnboard, t } from "./helpers";

/**
 * The track is a per-feature content filter, not an app mode: lists default
 * to the goal track, "all" lifts the filter, and the header has no switcher.
 */

test("reading list defaults to the goal track; 全部 reveals other tracks", async ({ page }) => {
  await registerAndOnboard(page, "toeic");

  await page.goto("/reading");
  await expect(page.getByRole("heading", { name: t.nav.reading })).toBeVisible();

  // Goal-track default: TOEIC content only.
  await expect(page.locator('a[href="/zh/reading/toeic-r-001"]')).toBeVisible();
  await expect(page.locator('a[href="/zh/reading/biz-r-001"]')).toHaveCount(0);

  // The 全部 chip lifts the filter and reveals business content.
  const filterNav = page.getByRole("navigation", { name: t.filters.byTrack });
  await filterNav.getByRole("link", { name: t.filters.all }).click();
  await page.waitForURL("**/reading?track=all");
  await expect(page.locator('a[href="/zh/reading/biz-r-001"]')).toBeVisible();
  await expect(page.locator('a[href="/zh/reading/toeic-r-001"]')).toBeVisible();

  // A concrete chip narrows to that track.
  await filterNav.getByRole("link", { name: t.tracks.business }).click();
  await page.waitForURL("**/reading?track=business");
  await expect(page.locator('a[href="/zh/reading/toeic-r-001"]')).toHaveCount(0);
});

test("business goal sees both exam tracks by default; header has no switcher", async ({ page }) => {
  await registerAndOnboard(page, "business");

  await page.goto("/exams");
  await expect(page.getByRole("heading", { name: t.nav.exams })).toBeVisible();
  await expect(page.locator('a[href="/zh/exams/exam-toeic-mini"]')).toBeVisible();
  await expect(page.locator('a[href="/zh/exams/exam-ielts-mini"]')).toBeVisible();

  // No track mode remains in the chrome: the app header carries no switcher
  // control, only the per-page filter nav.
  await expect(page.locator("header").getByRole("combobox")).toHaveCount(0);

  // Narrowing to one exam track hides the other.
  await page
    .getByRole("navigation", { name: t.filters.byTrack })
    .getByRole("link", { name: t.tracks.ielts })
    .click();
  await page.waitForURL("**/exams?track=ielts");
  await expect(page.locator('a[href="/zh/exams/exam-toeic-mini"]')).toHaveCount(0);
  await expect(page.locator('a[href="/zh/exams/exam-ielts-mini"]')).toBeVisible();
});

test("an invalid ?track= degrades to the goal default", async ({ page }) => {
  await registerAndOnboard(page, "ielts");

  await page.goto("/reading?track=gre");
  await expect(page.locator('a[href="/zh/reading/ielts-r-001"]')).toBeVisible();
  await expect(page.locator('a[href="/zh/reading/toeic-r-001"]')).toHaveCount(0);
});
