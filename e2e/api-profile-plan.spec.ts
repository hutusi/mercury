import { expect, test } from "@playwright/test";
import { apiSignUpAndOnboard } from "./api-helpers";

test.describe("API learner profile + daily plan", () => {
  test("defaults → PATCH goals → practice signal moves an estimate → plan follows", async ({
    request,
  }) => {
    const user = await apiSignUpAndOnboard(request, "toeic");

    // Onboarding atomically creates the profile substrate with the selected
    // goal track; the remaining goal fields and estimates start at defaults.
    const initialRes = await request.get("/api/v1/me/profile", { headers: user.authHeaders });
    expect(initialRes.status()).toBe(200);
    const { profile: defaults } = await initialRes.json();
    expect(defaults.goalTrack).toBe("toeic");
    expect(defaults.dailyMinutes).toBe(20);
    expect(defaults.skillEstimates.reading.confidence).toBe("low");

    // PATCH goals; server-owned fields in the body are ignored, and the first
    // write seeds estimates from the self-rating (intermediate → 50).
    const patchRes = await request.patch("/api/v1/me/profile", {
      headers: user.authHeaders,
      data: {
        goalTrack: "toeic",
        targetScore: 800,
        dailyMinutes: 30,
        selfRatedLevel: "intermediate",
        skillEstimates: { reading: { estimate: 100, confidence: "high" } },
      },
    });
    expect(patchRes.status()).toBe(200);
    const { profile } = await patchRes.json();
    expect(profile.targetScore).toBe(800);
    expect(profile.dailyMinutes).toBe(30);
    expect(profile.selfRatedLevel).toBe("intermediate");
    expect(profile.skillEstimates.reading.estimate).toBe(50);

    // A (deliberately wrong) exercise attempt folds an accuracy signal into
    // the reading estimate — the end-to-end proof of the service wiring.
    const { exercises } = await (
      await request.get("/api/v1/reading", { headers: user.authHeaders })
    ).json();
    const detail = await (
      await request.get(`/api/v1/reading/${exercises[0].id}`, { headers: user.authHeaders })
    ).json();
    const answers: Record<string, number> = {};
    for (const q of detail.questions) answers[q.id] = 0;
    const attemptRes = await request.post(`/api/v1/exercises/reading/${detail.id}/attempts`, {
      headers: user.authHeaders,
      data: { answers, durationSeconds: 60 },
    });
    expect(attemptRes.status()).toBe(200);

    // Confidence low → medium is the deterministic marker that the signal ran
    // (the estimate itself depends on how many first options were right).
    const { profile: updated } = await (
      await request.get("/api/v1/me/profile", { headers: user.authHeaders })
    ).json();
    expect(updated.skillEstimates.reading.confidence).toBe("medium");
    expect(updated.skillEstimates.writing.confidence).toBe("low");

    // The plan is never empty and respects the configured budget.
    const planRes = await request.get("/api/v1/plan", { headers: user.authHeaders });
    expect(planRes.status()).toBe(200);
    const plan = await planRes.json();
    expect(plan.dailyMinutes).toBe(30);
    expect(plan.items.length).toBeGreaterThan(0);
    expect(plan.items[0]).toHaveProperty("kind");
    expect(plan.items[0]).toHaveProperty("estMinutes");
    expect(plan.items[0]).toHaveProperty("reasonKey");
  });

  test("validation: IELTS band×10 range enforced, bad dates rejected", async ({ request }) => {
    const user = await apiSignUpAndOnboard(request, "ielts");
    const bad = await request.patch("/api/v1/me/profile", {
      headers: user.authHeaders,
      data: { examDate: "next week" },
    });
    expect(bad.status()).toBe(422);

    const ok = await request.patch("/api/v1/me/profile", {
      headers: user.authHeaders,
      data: { goalTrack: "ielts", targetScore: 65, examDate: "2026-12-01" },
    });
    expect(ok.status()).toBe(200);
    const { profile } = await ok.json();
    expect(profile.targetScore).toBe(65); // band 6.5, stored ×10
  });
});
