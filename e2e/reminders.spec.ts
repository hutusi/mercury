import { expect, test } from "@playwright/test";
import { apiSignUp, apiSignUpAndOnboard } from "./api-helpers";
import { registerAndOnboard, t } from "./helpers";

test.describe("study reminders", () => {
  test("fresh users see no nudge; the toggle flips and persists", async ({ page }) => {
    await registerAndOnboard(page);

    // Fresh account: no streak — the at-risk note stays hidden.
    await expect(page.getByText(t.dashboard.reminderStreakTitle)).toHaveCount(0);

    // The toggle lives in Settings.
    await page.goto("/settings");
    // Default is on; turning it off survives a reload (persisted setting).
    // The reminder toggle comes first on the page (the security section
    // below reuses the same on/off labels for its own toggle).
    await page.getByRole("button", { name: t.dashboard.reminderToggleOn }).first().click();
    const offButton = page.getByRole("button", { name: t.dashboard.reminderToggleOff }).first();
    // The label flips optimistically and the button stays disabled until the
    // server action commits — wait for enabled, or the reload races the write.
    await expect(offButton).toBeVisible();
    await expect(offButton).toBeEnabled();
    await page.reload();
    await expect(
      page.getByRole("button", { name: t.dashboard.reminderToggleOff }).first(),
    ).toBeVisible();
  });

  test("PATCH /api/v1/me/settings flips remindersEnabled", async ({ request }) => {
    const user = await apiSignUpAndOnboard(request);

    const me = await request.get("/api/v1/me", { headers: user.authHeaders });
    expect((await me.json()).settings.remindersEnabled).toBe(true);

    const patched = await request.patch("/api/v1/me/settings", {
      headers: user.authHeaders,
      data: { remindersEnabled: false },
    });
    expect(patched.status()).toBe(200);
    expect((await patched.json()).settings.remindersEnabled).toBe(false);

    // Persisted, not just echoed.
    const meAfter = await request.get("/api/v1/me", { headers: user.authHeaders });
    expect((await meAfter.json()).settings.remindersEnabled).toBe(false);
  });

  test("PATCH validates the body and rejects anonymous calls", async ({ request }) => {
    const anon = await request.patch("/api/v1/me/settings", {
      data: { remindersEnabled: false },
    });
    expect(anon.status()).toBe(401);

    const user = await apiSignUp();
    const invalid = await request.patch("/api/v1/me/settings", {
      headers: user.authHeaders,
      data: { remindersEnabled: "yes" },
    });
    expect(invalid.status()).toBe(422);
    expect((await invalid.json()).error.code).toBe("validation_failed");
  });
});
