import { expect, test } from "@playwright/test";
import { apiSignUpAndOnboard } from "./api-helpers";

// The e2e server runs with ANTHROPIC_API_KEY="" (playwright.config.ts), so
// every submission exercises the degradation path: status "self_assessed",
// selfAssess material in the detail, and 503 on retry.

test.describe("API writing (AI degradation)", () => {
  test("submit degrades to self-assessment; retry is 503 without a key", async ({ request }) => {
    const user = await apiSignUpAndOnboard(request, "ielts");

    const listRes = await request.get("/api/v1/writing", { headers: user.authHeaders });
    expect(listRes.status()).toBe(200);
    const { prompts } = await listRes.json();
    expect(prompts.length).toBeGreaterThan(0);

    // Prompt detail never carries the model answer (web parity).
    const detailText = await (
      await request.get(`/api/v1/writing/${prompts[0].id}`, { headers: user.authHeaders })
    ).text();
    expect(detailText).not.toContain("modelAnswer");
    const detail = JSON.parse(detailText);
    expect(detail.prompt.promptEn).toBeTruthy();
    expect(detail.pastSubmissions).toEqual([]);

    // Too-short essay is a 422 from the shared Zod schema.
    const tooShort = await request.post(`/api/v1/writing/${prompts[0].id}/submissions`, {
      headers: user.authHeaders,
      data: { requestId: crypto.randomUUID(), text: "too short" },
    });
    expect(tooShort.status()).toBe(422);

    const essay =
      "Remote work has reshaped how modern companies operate. It offers flexibility, reduces commuting, and can improve focus, though it also demands deliberate communication and self-discipline from every member of a distributed team.";
    const requestId = crypto.randomUUID();
    const submitRes = await request.post(`/api/v1/writing/${prompts[0].id}/submissions`, {
      headers: user.authHeaders,
      data: { requestId, text: essay },
    });
    expect(submitRes.status()).toBe(200);
    const submitted = await submitRes.json();
    expect(submitted.status).toBe("self_assessed");
    expect(submitted.feedback).toBeNull(); // same result contract as speaking

    // A lost response can be replayed without creating or grading twice.
    const replay = await request.post(`/api/v1/writing/${prompts[0].id}/submissions`, {
      headers: user.authHeaders,
      data: { requestId, text: essay },
    });
    expect(replay.status()).toBe(200);
    expect((await replay.json()).submissionId).toBe(submitted.submissionId);

    const conflictingReplay = await request.post(`/api/v1/writing/${prompts[0].id}/submissions`, {
      headers: user.authHeaders,
      data: { requestId, text: `${essay} Changed.` },
    });
    expect(conflictingReplay.status()).toBe(409);
    expect((await conflictingReplay.json()).error.code).toBe("grading_request_conflict");

    // Detail: degradation contract — feedback null, selfAssess present.
    const subRes = await request.get(`/api/v1/writing/submissions/${submitted.submissionId}`, {
      headers: user.authHeaders,
    });
    expect(subRes.status()).toBe(200);
    const sub = await subRes.json();
    expect(sub.status).toBe("self_assessed");
    expect(sub.feedback).toBeNull();
    expect(sub.selfAssess.modelAnswer).toBeTruthy();
    expect(sub.selfAssess.checklist.length).toBeGreaterThan(0);
    expect(sub.canRetryAi).toBe(false); // no key on the e2e server

    // Retry without a key: the 503 envelope, not a crash.
    const retryRes = await request.post(
      `/api/v1/writing/submissions/${submitted.submissionId}/retry-feedback`,
      { headers: user.authHeaders, data: { requestId: crypto.randomUUID() } },
    );
    expect(retryRes.status()).toBe(503);
    expect((await retryRes.json()).error.code).toBe("ai_unavailable");
  });

  test("another user's submission is invisible (404)", async ({ request }) => {
    const alice = await apiSignUpAndOnboard(request, "ielts");
    const { prompts } = await (
      await request.get("/api/v1/writing", { headers: alice.authHeaders })
    ).json();
    const { submissionId } = await (
      await request.post(`/api/v1/writing/${prompts[0].id}/submissions`, {
        headers: alice.authHeaders,
        data: {
          requestId: crypto.randomUUID(),
          text: "A sufficiently long essay body for the validation threshold to pass easily.",
        },
      })
    ).json();

    const mallory = await apiSignUpAndOnboard(request, "ielts");
    const res = await request.get(`/api/v1/writing/submissions/${submissionId}`, {
      headers: mallory.authHeaders,
    });
    expect(res.status()).toBe(404);
  });
});

test.describe("API speaking (AI degradation)", () => {
  test("prompt carries practice material; transcript submit degrades gracefully", async ({
    request,
  }) => {
    const user = await apiSignUpAndOnboard(request, "toeic");

    const { prompts } = await (
      await request.get("/api/v1/speaking", { headers: user.authHeaders })
    ).json();
    expect(prompts.length).toBeGreaterThan(0);

    // Web parity: the speaking runner shows modelAnswer/checklist up front.
    const detail = await (
      await request.get(`/api/v1/speaking/${prompts[0].id}`, { headers: user.authHeaders })
    ).json();
    expect(detail.prompt.modelAnswer).toBeTruthy();
    expect(detail.prompt.speakSeconds).toBeGreaterThan(0);

    const submitRes = await request.post(`/api/v1/speaking/${prompts[0].id}/submissions`, {
      headers: user.authHeaders,
      data: {
        requestId: crypto.randomUUID(),
        transcript:
          "I believe the chart shows a steady increase in sales over the second quarter of the year.",
        durationSeconds: 42,
      },
    });
    expect(submitRes.status()).toBe(200);
    const submitted = await submitRes.json();
    expect(submitted.status).toBe("self_assessed");
    expect(submitted.feedback).toBeNull();

    const sub = await (
      await request.get(`/api/v1/speaking/submissions/${submitted.submissionId}`, {
        headers: user.authHeaders,
      })
    ).json();
    expect(sub.transcript).toContain("steady increase");
    expect(sub.selfAssess.modelAnswer).toBeTruthy();

    const retryRes = await request.post(
      `/api/v1/speaking/submissions/${submitted.submissionId}/retry-feedback`,
      { headers: user.authHeaders, data: { requestId: crypto.randomUUID() } },
    );
    expect(retryRes.status()).toBe(503);
    expect((await retryRes.json()).error.code).toBe("ai_unavailable");
  });
});
