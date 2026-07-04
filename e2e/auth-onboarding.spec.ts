import { expect, test } from "@playwright/test";
import { pickTrack, registerAndOnboard, registerUser, t } from "./helpers";

test("register → forced onboarding → dashboard", async ({ page }) => {
  await registerUser(page);

  // Onboarding shows the three track cards.
  await expect(page.getByRole("heading", { name: t.onboarding.title })).toBeVisible();

  await pickTrack(page, "toeic");

  // Dashboard renders greeting + core cards.
  await expect(page.getByText(t.dashboard.streak)).toBeVisible();
  await expect(page.getByText(t.dashboard.examBanner)).toBeVisible();
  await expect(page.getByText(t.dashboard.quickStart)).toBeVisible();
});

test("new account sees first-run guidance until it completes an activity", async ({ page }) => {
  await registerAndOnboard(page, "toeic");

  // Fresh dashboard: orientation instead of a wall of zeros.
  await expect(page.getByRole("heading", { name: t.dashboard.welcomeTitle })).toBeVisible();

  // Completing one activity (grading a flashcard) clears the first-run state.
  await page.goto("/vocabulary/study");
  await page.getByText(t.vocab.flipHint).click();
  const goodButton = page.getByRole("button", { name: t.vocab.good, exact: true });
  await expect(goodButton).toBeVisible();
  await goodButton.click();
  // Wait until the grade has committed (the reviewed counter only increments
  // after the server action resolves) before navigating, so the activity write
  // has landed — the async Postgres write, unlike the old synchronous SQLite
  // one, isn't guaranteed to finish before an immediate page.goto.
  await expect(page.getByText(`${t.vocab.reviewedCount}: 1`)).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: t.dashboard.welcomeTitle })).toBeHidden();
});

test("unauthenticated /dashboard redirects to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForURL("**/login");
  await expect(page.getByRole("heading", { name: t.auth.loginTitle })).toBeVisible();
});
