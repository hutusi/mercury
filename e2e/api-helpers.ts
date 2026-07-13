import { expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";

/** Must match PORT in playwright.config.ts. */
const API_BASE = "http://localhost:3100";

let apiUserCounter = 0;

export interface ApiUser {
  email: string;
  password: string;
  token: string;
  authHeaders: { Authorization: string };
}

/** Fresh cookie-less request context, as a just-installed native app would be. */
export async function newApiContext(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({ baseURL: API_BASE });
}

/**
 * Sign up a fresh user over HTTP and capture the bearer token from the
 * `set-auth-token` response header — the exact flow the iOS client uses.
 *
 * Runs in a throwaway request context so the session cookie better-auth also
 * sets never leaks into the caller's context: API tests must authenticate via
 * the bearer header alone, and a stored cookie sent without an Origin header
 * would trip better-auth's CSRF check on later auth POSTs.
 */
export async function apiSignUp(): Promise<ApiUser> {
  apiUserCounter += 1;
  const email = `api-user-${Date.now()}-${apiUserCounter}@example.com`;
  const password = "password123";

  const ctx = await newApiContext();
  try {
    const res = await ctx.post("/api/auth/sign-up/email", {
      data: { name: "API User", email, password },
    });
    expect(res.ok()).toBeTruthy();
    const token = res.headers()["set-auth-token"];
    expect(token, "sign-up should emit a set-auth-token header (bearer plugin)").toBeTruthy();
    return { email, password, token, authHeaders: { Authorization: `Bearer ${token}` } };
  } finally {
    await ctx.dispose();
  }
}

/** Pick a track over the API (the onboarding step for API users). */
export async function apiOnboard(
  request: APIRequestContext,
  user: ApiUser,
  track: "toeic" | "ielts" | "business" = "toeic",
): Promise<void> {
  const res = await request.put("/api/v1/me/settings", {
    headers: user.authHeaders,
    data: { track, timeZone: "Asia/Shanghai" },
  });
  expect(res.ok()).toBeTruthy();
}

/** Sign up + pick a track in one step. */
export async function apiSignUpAndOnboard(
  request: APIRequestContext,
  track: "toeic" | "ielts" | "business" = "toeic",
): Promise<ApiUser> {
  const user = await apiSignUp();
  await apiOnboard(request, user, track);
  return user;
}
