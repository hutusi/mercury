import { expect, test } from "@playwright/test";
import { apiSignUpAndOnboard } from "./api-helpers";
import { registerAndOnboard, t } from "./helpers";

/**
 * The book tutor chat (ADR 0030) is premium-only AND needs an AI key, so the
 * keyless free-tier e2e environment can only assert absence — which is
 * exactly the contract: the reader must be unchanged for free/keyless users.
 * The positive path (gate ordering, context whitelist, prompt guards) is
 * carried by the bun tests in src/lib/book-chat-core.test.ts and
 * src/lib/membership-core.test.ts.
 */
test.describe("book tutor chat", () => {
  test("keyless free reader: no chat entry points, reader unchanged", async ({ page }) => {
    await registerAndOnboard(page);

    await page.goto("/books/book-oz/chapters/oz-ch-01");
    await expect(page.getByRole("heading", { name: "The Cyclone" })).toBeVisible();

    // The premium gate hides the feature entirely — no floating button, no
    // panel markup anywhere in the document.
    await expect(page.getByRole("button", { name: t.bookChat.openLabel })).toHaveCount(0);
    expect(await page.content()).not.toContain("book-tutor-panel");
  });

  test("API: GET carries the gate as data; keyless POST is a 503 that persists nothing", async ({
    request,
  }) => {
    // The chat route is onboarding-gated like the main tutor (unlike the
    // read-only book routes, which only need a user).
    const user = await apiSignUpAndOnboard(request, "toeic");

    const getRes = await request.get("/api/v1/books/book-oz/chat/messages", {
      headers: user.authHeaders,
    });
    expect(getRes.status()).toBe(200);
    const data = await getRes.json();
    expect(data.enabled).toBe(false);
    expect(data.entitled).toBe(false); // e2e users are free tier
    expect(data.messages).toEqual([]);
    expect(data.dailyLimit).toBeGreaterThan(0);
    expect(data.remainingToday).toBe(data.dailyLimit);

    // Keyless comes before the premium gate: the feature reports absent
    // (503), never a premium_required it could not serve anyway.
    const postRes = await request.post("/api/v1/books/book-oz/chat/messages", {
      headers: user.authHeaders,
      data: { chapterId: "oz-ch-01", content: "What does cyclone mean here?" },
    });
    expect(postRes.status()).toBe(503);
    expect((await postRes.json()).error.code).toBe("ai_unavailable");

    const after = await (
      await request.get("/api/v1/books/book-oz/chat/messages", { headers: user.authHeaders })
    ).json();
    expect(after.messages).toEqual([]);
    expect(after.remainingToday).toBe(after.dailyLimit);
  });

  test("API: unknown book 404s, missing auth 401s", async ({ request }) => {
    const user = await apiSignUpAndOnboard(request, "toeic");

    const unknown = await request.get("/api/v1/books/not-a-book/chat/messages", {
      headers: user.authHeaders,
    });
    expect(unknown.status()).toBe(404);

    const unauthed = await request.get("/api/v1/books/book-oz/chat/messages");
    expect(unauthed.status()).toBe(401);
  });
});
