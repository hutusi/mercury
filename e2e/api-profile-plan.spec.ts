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
      data: { requestId: crypto.randomUUID(), answers, durationSeconds: 60 },
    });
    expect(attemptRes.status()).toBe(200);

    // Confidence low → medium is the deterministic marker that the signal ran
    // (the estimate itself depends on how many first options were right).
    const { profile: updated } = await (
      await request.get("/api/v1/me/profile", { headers: user.authHeaders })
    ).json();
    expect(updated.skillEstimates.reading.confidence).toBe("medium");
    expect(updated.skillEstimates.writing.confidence).toBe("low");

    // A later self-rating edit changes the stated level but must not erase
    // estimates that have already incorporated observed practice.
    const observedReading = updated.skillEstimates.reading;
    const rerateRes = await request.patch("/api/v1/me/profile", {
      headers: user.authHeaders,
      data: { selfRatedLevel: "advanced" },
    });
    expect(rerateRes.status()).toBe(200);
    const { profile: rerated } = await rerateRes.json();
    expect(rerated.selfRatedLevel).toBe("advanced");
    expect(rerated.skillEstimates.reading).toEqual(observedReading);

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

  test("goal track drives list defaults; ?track= overrides; goal is non-clearable", async ({
    request,
  }) => {
    const user = await apiSignUpAndOnboard(request, "toeic");

    // Absent param = goal-track default.
    const byGoal = await (
      await request.get("/api/v1/reading", { headers: user.authHeaders })
    ).json();
    expect(byGoal.exercises.some((e: { id: string }) => e.id.startsWith("toeic-"))).toBe(true);
    expect(byGoal.exercises.some((e: { id: string }) => e.id.startsWith("biz-"))).toBe(false);

    // "all" lifts the filter; an invalid value is a 422 envelope.
    const all = await (
      await request.get("/api/v1/reading?track=all", { headers: user.authHeaders })
    ).json();
    expect(all.exercises.some((e: { id: string }) => e.id.startsWith("biz-"))).toBe(true);
    const invalid = await request.get("/api/v1/reading?track=gre", { headers: user.authHeaders });
    expect(invalid.status()).toBe(422);
    expect((await invalid.json()).error.code).toBe("validation_failed");

    // goalTrack changes but never clears.
    const clear = await request.patch("/api/v1/me/profile", {
      headers: user.authHeaders,
      data: { goalTrack: null },
    });
    expect(clear.status()).toBe(422);
    const move = await request.patch("/api/v1/me/profile", {
      headers: user.authHeaders,
      data: { goalTrack: "business" },
    });
    expect(move.status()).toBe(200);

    // The new goal becomes the default; a business goal sees both exam tracks
    // and the dashboard reports goalTrack.
    const bizList = await (
      await request.get("/api/v1/reading", { headers: user.authHeaders })
    ).json();
    expect(bizList.exercises.some((e: { id: string }) => e.id.startsWith("biz-"))).toBe(true);
    expect(bizList.exercises.some((e: { id: string }) => e.id.startsWith("toeic-"))).toBe(false);
    const exams = await (await request.get("/api/v1/exams", { headers: user.authHeaders })).json();
    const examTracks = new Set(exams.exams.map((e: { track: string }) => e.track));
    expect(examTracks.has("toeic")).toBe(true);
    expect(examTracks.has("ielts")).toBe(true);
    const dash = await (
      await request.get("/api/v1/dashboard", { headers: user.authHeaders })
    ).json();
    expect(dash.goalTrack).toBe("business");
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

    // Same-track patches keep goal fields; a track change resets them unless
    // resupplied — an IELTS 65 must never linger under a TOEIC goal.
    const sameTrack = await request.patch("/api/v1/me/profile", {
      headers: user.authHeaders,
      data: { goalTrack: "ielts", dailyMinutes: 15 },
    });
    expect((await sameTrack.json()).profile.targetScore).toBe(65);
    const moved = await request.patch("/api/v1/me/profile", {
      headers: user.authHeaders,
      data: { goalTrack: "toeic" },
    });
    const { profile: reset } = await moved.json();
    expect(reset.goalTrack).toBe("toeic");
    expect(reset.targetScore).toBeNull();
    expect(reset.examDate).toBeNull();
  });
});
