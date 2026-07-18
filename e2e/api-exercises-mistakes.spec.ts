import { expect, test } from "@playwright/test";
import { apiSignUpAndOnboard } from "./api-helpers";

test.describe("API exercises + mistakes notebook", () => {
  test("reading: list → sanitized detail → graded attempt → mistake → retest → cleared", async ({
    request,
  }) => {
    const user = await apiSignUpAndOnboard(request, "toeic");

    // List: metadata only, no attempt yet.
    const listRes = await request.get("/api/v1/reading", { headers: user.authHeaders });
    expect(listRes.status()).toBe(200);
    const { exercises } = await listRes.json();
    expect(exercises.length).toBeGreaterThan(0);
    expect(exercises[0].best).toBeNull();
    expect(exercises[0].questionCount).toBeGreaterThan(0);

    // Detail is sanitized: the raw response body must not carry the key.
    const detailRes = await request.get(`/api/v1/reading/${exercises[0].id}`, {
      headers: user.authHeaders,
    });
    expect(detailRes.status()).toBe(200);
    const detailText = await detailRes.text();
    expect(detailText).not.toContain("correctIndex");
    expect(detailText).not.toContain("explanationZh");
    const detail = JSON.parse(detailText);
    expect(detail.passage).toBeTruthy();
    expect(detail.questions.length).toBe(exercises[0].questionCount);

    // Answer everything with option 0 — the key ships only in the graded result.
    const answers: Record<string, number> = {};
    for (const q of detail.questions) answers[q.id] = 0;
    const attemptRes = await request.post(`/api/v1/exercises/reading/${detail.id}/attempts`, {
      headers: user.authHeaders,
      data: { requestId: crypto.randomUUID(), answers, durationSeconds: 60 },
    });
    expect(attemptRes.status()).toBe(200);
    const graded = await attemptRes.json();
    expect(graded.total).toBe(detail.questions.length);
    expect(graded.perQuestion[0].explanationZh).toBeTruthy();

    const wrong = graded.perQuestion.filter((p: { correct: boolean }) => !p.correct);
    expect(wrong.length).toBeGreaterThan(0); // seeded content: option 0 is not always right

    // The wrong answers surface as active mistakes — sanitized again.
    const mistakesRes = await request.get("/api/v1/mistakes", { headers: user.authHeaders });
    expect(mistakesRes.status()).toBe(200);
    const mistakesText = await mistakesRes.text();
    expect(mistakesText).not.toContain("correctIndex");
    const mistakes = JSON.parse(mistakesText);
    expect(mistakes.counts.active).toBe(wrong.length);
    const target = mistakes.active.find(
      (m: { questionId: string }) => m.questionId === wrong[0].questionId,
    );
    expect(target).toBeTruthy();
    expect(target.kind).toBe("reading");

    // Retest wrong: key is revealed (post-answer), mistake stays active.
    const wrongIdx = (wrong[0].correctIndex + 1) % 4;
    const retestWrong = await request.post("/api/v1/mistakes/retest", {
      headers: user.authHeaders,
      data: {
        kind: "reading",
        refId: detail.id,
        questionId: target.questionId,
        chosenIndex: wrongIdx,
      },
    });
    expect(retestWrong.status()).toBe(200);
    const retestWrongBody = await retestWrong.json();
    expect(retestWrongBody.correct).toBe(false);
    expect(retestWrongBody.correctIndex).toBe(wrong[0].correctIndex);

    // Retest right: cleared.
    const retestRight = await request.post("/api/v1/mistakes/retest", {
      headers: user.authHeaders,
      data: {
        kind: "reading",
        refId: detail.id,
        questionId: target.questionId,
        chosenIndex: wrong[0].correctIndex,
      },
    });
    expect(retestRight.status()).toBe(200);
    expect((await retestRight.json()).correct).toBe(true);

    const after = await request.get("/api/v1/mistakes", { headers: user.authHeaders });
    const afterBody = await after.json();
    expect(afterBody.counts.active).toBe(wrong.length - 1);
    expect(
      afterBody.cleared.some((m: { questionId: string }) => m.questionId === target.questionId),
    ).toBe(true);
  });

  test("retesting a question that is not an active mistake is a 403", async ({ request }) => {
    const user = await apiSignUpAndOnboard(request, "toeic");

    // Fetch a real question id without ever answering it.
    const { exercises } = await (
      await request.get("/api/v1/reading", { headers: user.authHeaders })
    ).json();
    const detail = await (
      await request.get(`/api/v1/reading/${exercises[0].id}`, { headers: user.authHeaders })
    ).json();

    const res = await request.post("/api/v1/mistakes/retest", {
      headers: user.authHeaders,
      data: {
        kind: "reading",
        refId: detail.id,
        questionId: detail.questions[0].id,
        chosenIndex: 0,
      },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("integrity");
  });

  test("listening detail keeps the script for on-device TTS", async ({ request }) => {
    const user = await apiSignUpAndOnboard(request, "toeic");

    const { exercises } = await (
      await request.get("/api/v1/listening", { headers: user.authHeaders })
    ).json();
    expect(exercises.length).toBeGreaterThan(0);

    const res = await request.get(`/api/v1/listening/${exercises[0].id}`, {
      headers: user.authHeaders,
    });
    const text = await res.text();
    expect(text).not.toContain("correctIndex");
    const detail = JSON.parse(text);
    expect(detail.script.length).toBeGreaterThan(0);
    expect(detail.questions.length).toBeGreaterThan(0);
    // audioUrl is part of the contract: a /audio/ path when pre-generated
    // neural audio exists (ADR 0021), null when the client should fall back
    // to speaking the script on-device.
    expect(detail).toHaveProperty("audioUrl");
    if (detail.audioUrl !== null) {
      // Origin-relative without MERCURY_AUDIO_BASE_URL (the e2e default),
      // absolute Blob URL when an environment sets it — accept both.
      expect(detail.audioUrl).toMatch(/\/audio\/listening\//);
    }
  });
});
