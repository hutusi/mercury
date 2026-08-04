import { expect, test } from "@playwright/test";
import { registerAndOnboard, t } from "./helpers";

test("premium: settings CTA reaches the page; interest persists across reload", async ({
  page,
}) => {
  await registerAndOnboard(page, "toeic");

  // The settings membership row carries the door to /premium.
  await page.goto("/settings");
  await page.getByRole("link", { name: new RegExp(t.premium.learnMore) }).click();
  await page.waitForURL("**/premium");

  // The limits table compares current vs premium with real numbers.
  await expect(page.getByRole("heading", { name: t.settings.membershipPremium })).toBeVisible();
  await expect(page.getByText(t.premium.chatLimitLabel)).toBeVisible();
  await expect(page.getByText(t.premium.gradingLimitLabel)).toBeVisible();

  // 预约开通 writes the demand row — the reload proves persistence, not just
  // the button's local state.
  await page.getByRole("button", { name: t.premium.interestCta }).click();
  await expect(page.getByText(t.premium.interested)).toBeVisible();
  await page.reload();
  await expect(page.getByText(t.premium.interested)).toBeVisible();
});
