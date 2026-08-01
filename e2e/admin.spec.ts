import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { apiSignUpAndOnboard } from "./api-helpers";
import { e2eDatabaseUrl } from "./db-url";
import { registerAndOnboard, t } from "./helpers";

/**
 * The full membership operating loop: a fresh user has no admin surface; the
 * admin:grant CLI (run against the same scratch DB the server uses) promotes
 * them; the admin console grants premium to a second user; and the grant is
 * visible end-to-end — /me tier flips and the tutor dailyLimit rises from the
 * free 30 to the premium 100 (neither env override is set in e2e).
 */
test("admin promotion, premium grant, and revoke thread end-to-end", async ({ page, request }) => {
  test.setTimeout(120_000);

  // A regular user sees no admin nav and gets a 404 on the admin page.
  const admin = await registerAndOnboard(page);
  await expect(page.getByRole("link", { name: t.nav.admin })).toHaveCount(0);
  await page.goto("/zh/admin");
  await expect(page.getByText(t.errors.notFoundTitle)).toBeVisible();

  // The admin plugin's HTTP surface is blocked outright (ADR 0025): the
  // endpoints must 404 for everyone, before better-auth ever sees the request.
  const blocked = await request.post("/api/auth/admin/list-users", { data: {} });
  expect(blocked.status()).toBe(404);

  // A mistyped flag must fail loudly, not fall through to the grant path.
  expect(() =>
    execSync(`bun run admin:grant ${admin.email} --revkoe`, {
      env: { ...process.env, DATABASE_URL: e2eDatabaseUrl() },
      stdio: "pipe",
    }),
  ).toThrow();

  // Promote via the declared entry point — the same command operators run —
  // so the spec and package.json can't drift apart.
  execSync(`bun run admin:grant ${admin.email}`, {
    env: { ...process.env, DATABASE_URL: e2eDatabaseUrl() },
    stdio: "pipe",
  });

  // Role is read fresh from Postgres per request — a reload is enough.
  await page.goto("/zh/dashboard");
  await page.getByRole("link", { name: t.nav.admin }).click();
  await page.waitForURL("**/admin");
  const adminRow = page.locator("tr", { hasText: admin.email });
  await expect(adminRow.getByText(t.admin.roleAdmin)).toBeVisible();

  // A second (API) user starts free with the free-tier chat limit.
  const member = await apiSignUpAndOnboard(request);
  const before = await request.get("/api/v1/tutor/messages", { headers: member.authHeaders });
  expect(before.ok()).toBeTruthy();
  const freeLimit = ((await before.json()) as { dailyLimit: number }).dailyLimit;

  const meBefore = await request.get("/api/v1/me", { headers: member.authHeaders });
  const meBeforeBody = (await meBefore.json()) as {
    user: { role: string };
    membership: { tier: string; expiresAt: string | null };
  };
  expect(meBeforeBody.user.role).toBe("user");
  expect(meBeforeBody.membership).toEqual({ tier: "free", expiresAt: null });

  // Grant premium (no expiry) from the admin console.
  await page.reload();
  const memberRow = page.locator("tr", { hasText: member.email });
  await memberRow.getByRole("button", { name: t.admin.grant }).click();
  await expect(memberRow.getByText(t.admin.tierPremium)).toBeVisible();
  await expect(memberRow.getByText(t.admin.noExpiry)).toBeVisible();

  // The grant threads through to the API surfaces: tier and a higher limit.
  const meAfter = await request.get("/api/v1/me", { headers: member.authHeaders });
  const meAfterBody = (await meAfter.json()) as {
    membership: { tier: string; expiresAt: string | null };
  };
  expect(meAfterBody.membership).toEqual({ tier: "premium", expiresAt: null });

  const after = await request.get("/api/v1/tutor/messages", { headers: member.authHeaders });
  const premiumLimit = ((await after.json()) as { dailyLimit: number }).dailyLimit;
  expect(premiumLimit).toBeGreaterThan(freeLimit);

  // Revoke returns the member to free on both surfaces.
  await memberRow.getByRole("button", { name: t.admin.revoke }).click();
  await expect(memberRow.getByText(t.admin.tierFree)).toBeVisible();

  const meRevoked = await request.get("/api/v1/me", { headers: member.authHeaders });
  const meRevokedBody = (await meRevoked.json()) as { membership: { tier: string } };
  expect(meRevokedBody.membership.tier).toBe("free");
});
