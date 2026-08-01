import { expect, test } from "@playwright/test";
import { registerAndOnboard, t } from "./helpers";

test("change password from settings; old password stops working", async ({ page, request }) => {
  const { email, password } = await registerAndOnboard(page);

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: t.settings.securitySection })).toBeVisible();
  // Keyless server: no social providers, so no linked-accounts block.
  await expect(page.getByText(t.settings.linkedAccountsLabel)).toHaveCount(0);

  // A wrong current password surfaces the specific error, not a generic one.
  await page.locator("#current-password").fill("not-the-password");
  await page.locator("#new-password").fill("newpassword456");
  await page.getByRole("button", { name: t.settings.updatePassword }).click();
  await expect(page.getByText(t.settings.wrongPassword)).toBeVisible();

  // The real current password succeeds.
  await page.locator("#current-password").fill(password);
  await page.locator("#new-password").fill("newpassword456");
  await page.getByRole("button", { name: t.settings.updatePassword }).click();
  await expect(page.getByText(t.settings.passwordChanged)).toBeVisible();

  // Old password rejected, new one accepted — via the cookie-free request
  // fixture (a stored cookie without an Origin header trips better-auth's
  // CSRF check; see e2e/api-helpers.ts).
  const stale = await request.post("/api/auth/sign-in/email", { data: { email, password } });
  expect(stale.status()).toBe(401);
  const fresh = await request.post("/api/auth/sign-in/email", {
    data: { email, password: "newpassword456" },
  });
  expect(fresh.ok()).toBeTruthy();
});
