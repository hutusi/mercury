import { expect, test } from "@playwright/test";
import { dictionaries } from "../src/lib/i18n/dictionaries";
import { registerAndOnboard, t } from "./helpers";

test("unprefixed URLs redirect to the default locale", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL("**/zh");
  await expect(page.getByRole("heading", { name: t.landing.heroTitle })).toBeVisible();
});

test("language toggle swaps the locale prefix and the UI language", async ({ page }) => {
  await registerAndOnboard(page);
  await expect(page).toHaveURL(/\/zh\/dashboard$/);
  await expect(page.getByText(t.dashboard.streak)).toBeVisible();

  await page.getByRole("button", { name: "Switch to English" }).click();
  await page.waitForURL("**/en/dashboard");
  await expect(page.getByText(dictionaries.en.dashboard.streak)).toBeVisible();

  // Preference sticks: an unprefixed visit now lands on /en.
  await page.goto("/dashboard");
  await page.waitForURL("**/en/dashboard");

  await page.getByRole("button", { name: "切换为中文" }).click();
  await page.waitForURL("**/zh/dashboard");
  await expect(page.getByText(t.dashboard.streak)).toBeVisible();
});

test("a cross-locale deep link renders that locale on first paint", async ({ page }) => {
  await registerAndOnboard(page); // leaves the zh cookie behind
  await page.goto("/en/dashboard");
  await expect(page).toHaveURL(/\/en\/dashboard$/);
  await expect(page.getByText(dictionaries.en.dashboard.streak)).toBeVisible();
});

test("logged-out visit to a prefixed protected path keeps its locale", async ({ page }) => {
  await page.goto("/en/dashboard");
  await page.waitForURL("**/en/login");
  await expect(page.getByRole("heading", { name: dictionaries.en.auth.loginTitle })).toBeVisible();
});
