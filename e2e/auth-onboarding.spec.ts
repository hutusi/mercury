import { expect, test } from "@playwright/test";
import { pickTrack, registerUser, t } from "./helpers";

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

test("unauthenticated /dashboard redirects to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForURL("**/login");
  await expect(page.getByRole("heading", { name: t.auth.loginTitle })).toBeVisible();
});
