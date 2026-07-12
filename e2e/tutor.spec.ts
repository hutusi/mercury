import { expect, test } from "@playwright/test";
import { apiSignUpAndOnboard } from "./api-helpers";
import { registerAndOnboard, t } from "./helpers";

test.describe("AI tutor chat", () => {
  test("keyless: tab renders a disabled state instead of a broken chat", async ({ page }) => {
    await registerAndOnboard(page);

    // Nav shows the tutor entry (sidebar + dashboard quick links both link it).
    await page.getByRole("link", { name: t.nav.tutor }).first().click();
    await page.waitForURL("**/tutor");

    await expect(page.getByRole("heading", { name: t.nav.tutor })).toBeVisible();
    // e2e runs with blank AI keys, so the degradation callout shows and the
    // composer is disabled — the page never pretends a coach is available.
    await expect(page.getByText(t.tutor.unavailable)).toBeVisible();
    await expect(page.getByPlaceholder(t.tutor.placeholder)).toBeDisabled();
    await expect(page.getByRole("button", { name: t.tutor.send })).toBeDisabled();
  });

  test("API: GET reports enabled=false, POST degrades with 503 envelope", async ({ request }) => {
    const user = await apiSignUpAndOnboard(request, "toeic");

    const getRes = await request.get("/api/v1/tutor/messages", { headers: user.authHeaders });
    expect(getRes.status()).toBe(200);
    const data = await getRes.json();
    expect(data.enabled).toBe(false);
    expect(data.messages).toEqual([]);
    expect(data.dailyLimit).toBeGreaterThan(0);
    expect(data.remainingToday).toBe(data.dailyLimit);

    const postRes = await request.post("/api/v1/tutor/messages", {
      headers: user.authHeaders,
      data: { content: "What's the difference between present and gift?" },
    });
    expect(postRes.status()).toBe(503);
    expect((await postRes.json()).error.code).toBe("ai_unavailable");

    // A degraded POST persists nothing and consumes no quota.
    const after = await (
      await request.get("/api/v1/tutor/messages", { headers: user.authHeaders })
    ).json();
    expect(after.messages).toEqual([]);
    expect(after.remainingToday).toBe(after.dailyLimit);
  });

  test("API: empty message fails validation", async ({ request }) => {
    const user = await apiSignUpAndOnboard(request, "toeic");
    const res = await request.post("/api/v1/tutor/messages", {
      headers: user.authHeaders,
      data: { content: "   " },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).error.code).toBe("validation_failed");
  });
});
