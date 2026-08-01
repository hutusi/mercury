import { expect, request as playwrightRequest, test } from "@playwright/test";
import { Pool } from "pg";
import { e2eDatabaseUrl } from "./db-url";
import { pickTrack, registerUser, t } from "./helpers";

/**
 * Runs against the email-enabled twin server (port 3101 — see
 * playwright.config.ts). Covers the soft-verification surfaces the keyless
 * suite can never execute: the /link-social 403 gate (the one
 * security-sensitive branch, which regressed once during implementation) and
 * the unverified banner. No email is ever delivered — the server runs with a
 * fake Resend key and sendEmail degrades silently — so verification state is
 * flipped directly in the scratch database.
 */
const EMAIL_BASE = "http://localhost:3101";

const pool = new Pool({ connectionString: e2eDatabaseUrl("mercury_e2e_email") });
test.afterAll(async () => {
  await pool.end();
});

async function setEmailVerified(email: string, value: boolean) {
  await pool.query('UPDATE "user" SET email_verified = $1 WHERE email = $2', [value, email]);
}

let userCounter = 0;
function freshEmail() {
  userCounter += 1;
  return `email-e2e-${Date.now()}-${userCounter}@example.com`;
}

const LINK_BODY = { data: { provider: "google", callbackURL: "/zh/settings" } };

test("bearer: sign-up issues a session; /link-social 403s until verified", async () => {
  const email = freshEmail();

  // Throwaway context for sign-up so the session cookie never leaks into the
  // bearer-only context (a cookie without an Origin header trips better-auth's
  // CSRF check — see e2e/api-helpers.ts).
  const signUpCtx = await playwrightRequest.newContext({ baseURL: EMAIL_BASE });
  const signUp = await signUpCtx.post("/api/auth/sign-up/email", {
    data: { name: "Email E2E", email, password: "password123" },
  });
  expect(signUp.ok()).toBeTruthy();
  // Soft model (ADR 0028): a session token is issued even with email enabled.
  const token = signUp.headers()["set-auth-token"];
  expect(token, "sign-up should emit set-auth-token despite email being enabled").toBeTruthy();
  await signUpCtx.dispose();

  const api = await playwrightRequest.newContext({
    baseURL: EMAIL_BASE,
    extraHTTPHeaders: { authorization: `Bearer ${token}` },
  });
  const denied = await api.post("/api/auth/link-social", LINK_BODY);
  expect(denied.status()).toBe(403);
  expect((await denied.json()).code).toBe("EMAIL_NOT_VERIFIED");

  await setEmailVerified(email, true);
  const allowed = await api.post("/api/auth/link-social", LINK_BODY);
  expect(allowed.status()).toBe(200);
  expect((await allowed.json()).url).toContain("accounts.google.com");
  await api.dispose();
});

test("cookie: /link-social 403s until verified", async () => {
  const email = freshEmail();

  // One context throughout: the jar keeps the sign-up session cookie, and the
  // Origin header makes the POSTs look like the browser they mimic.
  const api = await playwrightRequest.newContext({
    baseURL: EMAIL_BASE,
    extraHTTPHeaders: { origin: EMAIL_BASE },
  });
  const signUp = await api.post("/api/auth/sign-up/email", {
    data: { name: "Email E2E", email, password: "password123" },
  });
  expect(signUp.ok()).toBeTruthy();

  const denied = await api.post("/api/auth/link-social", LINK_BODY);
  expect(denied.status()).toBe(403);
  expect((await denied.json()).code).toBe("EMAIL_NOT_VERIFIED");

  await setEmailVerified(email, true);
  const allowed = await api.post("/api/auth/link-social", LINK_BODY);
  expect(allowed.status()).toBe(200);
  await api.dispose();
});

test("unverified banner shows on every app page and clears after verification", async ({
  page,
}) => {
  // registerUser also proves the soft-model UI flow: with email enabled,
  // sign-up still lands directly on onboarding (no check-inbox wall).
  const { email } = await registerUser(page);
  await pickTrack(page, "toeic");

  await expect(page.getByText(t.auth.verifyBannerTitle)).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByText(t.auth.verifyBannerTitle)).toBeVisible();

  await setEmailVerified(email, true);
  await page.reload();
  await expect(page.getByRole("heading", { name: t.settings.securitySection })).toBeVisible();
  await expect(page.getByText(t.auth.verifyBannerTitle)).toHaveCount(0);
});
