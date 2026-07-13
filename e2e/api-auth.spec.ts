import { expect, test } from "@playwright/test";
import { apiOnboard, apiSignUp, newApiContext } from "./api-helpers";

test.describe("API auth (bearer)", () => {
  test("requests without a token get a 401 envelope", async ({ request }) => {
    const res = await request.get("/api/v1/me");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("unauthorized");
    expect(body.error.message).toBeTruthy();
  });

  test("sign-up issues a bearer token that authenticates /me", async ({ request }) => {
    const user = await apiSignUp();
    const res = await request.get("/api/v1/me", { headers: user.authHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe(user.email);
    expect(body.settings).toBeNull(); // not onboarded yet
    expect(body.aiEnabled).toBe(false); // e2e server runs with ANTHROPIC_API_KEY=""
  });

  test("sign-in also returns a usable token", async ({ request }) => {
    const user = await apiSignUp();

    const ctx = await newApiContext();
    try {
      const res = await ctx.post("/api/auth/sign-in/email", {
        data: { email: user.email, password: user.password },
      });
      expect(res.ok()).toBeTruthy();
      const token = res.headers()["set-auth-token"];
      expect(token).toBeTruthy();

      const me = await request.get("/api/v1/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(me.status()).toBe(200);
    } finally {
      await ctx.dispose();
    }
  });

  test("PUT /me/settings onboards and /me reflects it", async ({ request }) => {
    const user = await apiSignUp();

    const put = await request.put("/api/v1/me/settings", {
      headers: user.authHeaders,
      data: { track: "ielts", timeZone: "America/Toronto" },
    });
    expect(put.status()).toBe(200);
    const putBody = await put.json();
    expect(putBody.settings.activeTrack).toBe("ielts");
    expect(putBody.settings.timeZone).toBe("America/Toronto");

    const me = await request.get("/api/v1/me", { headers: user.authHeaders });
    const meBody = await me.json();
    expect(meBody.settings.activeTrack).toBe("ielts");
    expect(meBody.settings.timeZone).toBe("America/Toronto");
    expect(meBody.settings.onboardedAt).toBeTruthy();
  });

  test("invalid track gets a 422 validation envelope", async ({ request }) => {
    const user = await apiSignUp();
    const res = await request.put("/api/v1/me/settings", {
      headers: user.authHeaders,
      data: { track: "klingon" },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("validation_failed");
    expect(Array.isArray(body.error.details)).toBe(true);
  });

  test("invalid IANA timezone gets a 422 validation envelope", async ({ request }) => {
    const user = await apiSignUp();
    const res = await request.put("/api/v1/me/settings", {
      headers: user.authHeaders,
      data: { track: "toeic", timeZone: "Mars/Olympus_Mons" },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).error.code).toBe("validation_failed");
  });

  test("malformed JSON body gets a 400 envelope", async ({ request }) => {
    const user = await apiSignUp();
    const res = await request.put("/api/v1/me/settings", {
      headers: { ...user.authHeaders, "content-type": "application/json" },
      // Buffer bypasses Playwright's JSON serialization of string bodies,
      // so the server sees genuinely malformed JSON.
      data: Buffer.from("{not json"),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_json");
  });

  test("track-gated endpoints 403 until onboarding completes", async ({ request }) => {
    const user = await apiSignUp();

    const before = await request.get("/api/v1/dashboard", { headers: user.authHeaders });
    expect(before.status()).toBe(403);
    const body = await before.json();
    expect(body.error.code).toBe("onboarding_required");

    await apiOnboard(request, user, "toeic");

    const after = await request.get("/api/v1/dashboard", { headers: user.authHeaders });
    expect(after.status()).toBe(200);
  });

  test("sign-out revokes the token", async ({ request }) => {
    const user = await apiSignUp();
    await apiOnboard(request, user);

    const signOut = await request.post("/api/auth/sign-out", {
      headers: user.authHeaders,
      data: {},
    });
    expect(signOut.ok()).toBeTruthy();

    const after = await request.get("/api/v1/me", { headers: user.authHeaders });
    expect(after.status()).toBe(401);
  });
});
