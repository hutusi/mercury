import { expect, test } from "@playwright/test";
import { registerAndOnboard, t } from "./helpers";

test("goal edit on /settings redirects feature defaults to the new track", async ({ page }) => {
  await registerAndOnboard(page, "toeic");

  // Header entry point → settings.
  await page.getByRole("link", { name: t.nav.settings }).click();
  await page.waitForURL("**/settings");
  // exact: "设置" is a substring of the "偏好设置" section label.
  await expect(page.getByRole("heading", { name: t.nav.settings, exact: true })).toBeVisible();

  // Switch the goal to IELTS and save.
  await page.getByRole("button", { name: t.tracks.ielts }).click();
  await page.getByRole("button", { name: t.settings.save, exact: true }).click();
  await expect(page.getByText(t.settings.saved)).toBeVisible();

  // Any further edit invalidates the saved indicator.
  await page.getByRole("button", { name: `45 ${t.onboarding.minutesUnit}` }).click();
  await expect(page.getByText(t.settings.saved)).toHaveCount(0);
  await page.getByRole("button", { name: t.settings.save, exact: true }).click();
  await expect(page.getByText(t.settings.saved)).toBeVisible();

  // Exams now default to the new goal track.
  await page.goto("/exams");
  await expect(page.locator('a[href="/zh/exams/exam-ielts-mini"]')).toBeVisible();
  await expect(page.locator('a[href="/zh/exams/exam-toeic-mini"]')).toHaveCount(0);
});

test("a business goal hides score and exam date", async ({ page }) => {
  await registerAndOnboard(page, "ielts");

  await page.goto("/settings");
  await expect(page.getByText(t.onboarding.targetScoreLabel)).toBeVisible();

  await page.getByRole("button", { name: t.tracks.business }).click();
  await expect(page.getByText(t.onboarding.targetScoreLabel)).toHaveCount(0);
  await expect(page.getByText(t.onboarding.examDateLabel)).toHaveCount(0);

  await page.getByRole("button", { name: t.settings.save, exact: true }).click();
  await expect(page.getByText(t.settings.saved)).toBeVisible();
});
