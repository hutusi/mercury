import { expect, test } from "@playwright/test";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as dbSchema from "../src/lib/db/schema";
import {
  aiGradingRequests,
  mistakeStates,
  speakingSubmissions,
  vocabQuizSessions,
  vocabWords,
  writingSubmissions,
} from "../src/lib/db/schema";
import { recordMistakeOutcomes } from "../src/lib/services/mistake-state";
import { apiSignUpAndOnboard } from "./api-helpers";

function e2eDatabaseUrl(): string {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) return "postgresql://localhost:5432/mercury_e2e";
  const url = new URL(base);
  url.pathname = "/mercury_e2e";
  return url.toString();
}

const pool = new Pool({ connectionString: e2eDatabaseUrl(), max: 2 });
const testDb = drizzle(pool, { schema: dbSchema });

test.afterAll(async () => {
  await pool.end();
});

async function userIdFor(
  request: Parameters<typeof apiSignUpAndOnboard>[0],
  headers: { Authorization: string },
): Promise<string> {
  const response = await request.get("/api/v1/me", { headers });
  expect(response.status()).toBe(200);
  return (await response.json()).user.id;
}

test.describe("persisted integrity regressions", () => {
  test("a newer correct watermark defeats an older late wrong outcome", async ({ request }) => {
    const user = await apiSignUpAndOnboard(request, "toeic");
    const userId = await userIdFor(request, user.authHeaders);
    const base = {
      userId,
      track: "toeic" as const,
      kind: "reading" as const,
      refId: "ordering-regression",
      outcomes: [{ questionId: "q1", correct: true }],
    };
    const olderWrongAt = new Date("2026-07-13T10:00:00.000Z");
    const newerCorrectAt = new Date("2026-07-13T10:01:00.000Z");
    const newestWrongAt = new Date("2026-07-13T10:02:00.000Z");

    await recordMistakeOutcomes(testDb, { ...base, occurredAt: newerCorrectAt });
    await recordMistakeOutcomes(testDb, {
      ...base,
      outcomes: [{ questionId: "q1", correct: false }],
      occurredAt: olderWrongAt,
    });

    let [state] = await testDb
      .select()
      .from(mistakeStates)
      .where(
        and(
          eq(mistakeStates.userId, userId),
          eq(mistakeStates.refId, base.refId),
          eq(mistakeStates.questionId, "q1"),
        ),
      );
    expect(state.wrongCount).toBe(1);
    expect(state.lastWrongAt).toEqual(olderWrongAt);
    expect(state.clearedAt).toEqual(newerCorrectAt);

    await recordMistakeOutcomes(testDb, {
      ...base,
      outcomes: [{ questionId: "q1", correct: false }],
      occurredAt: newestWrongAt,
    });
    [state] = await testDb
      .select()
      .from(mistakeStates)
      .where(
        and(
          eq(mistakeStates.userId, userId),
          eq(mistakeStates.refId, base.refId),
          eq(mistakeStates.questionId, "q1"),
        ),
      );
    expect(state.wrongCount).toBe(2);
    expect(state.lastWrongAt).toEqual(newestWrongAt);
    expect(state.lastWrongAt!.getTime()).toBeGreaterThan(state.clearedAt!.getTime());
  });

  test("an old vocab retest cannot clear a newer mistake generation", async ({ request }) => {
    const user = await apiSignUpAndOnboard(request, "toeic");
    const userId = await userIdFor(request, user.authHeaders);
    const [word] = await testDb
      .select()
      .from(vocabWords)
      .where(eq(vocabWords.track, "toeic"))
      .limit(1);
    expect(word).toBeTruthy();
    const firstWrongAt = new Date("2026-07-13T11:00:00.000Z");
    const newerWrongAt = new Date("2026-07-13T11:01:00.000Z");

    await recordMistakeOutcomes(testDb, {
      userId,
      track: "toeic",
      kind: "vocab_quiz",
      refId: "quiz-toeic",
      outcomes: [{ questionId: word.id, correct: false }],
      occurredAt: firstWrongAt,
    });
    const created = await request.post("/api/v1/mistakes/vocab-retest", {
      headers: user.authHeaders,
      data: { wordId: word.id },
    });
    expect(created.status()).toBe(201);
    const sessionResource = await created.json();
    const [session] = await testDb
      .select()
      .from(vocabQuizSessions)
      .where(eq(vocabQuizSessions.id, sessionResource.sessionId));
    const question = session.questions[0];
    const correctOption = question.options.find((option) => option.wordId === question.wordId)!;

    await recordMistakeOutcomes(testDb, {
      userId,
      track: "toeic",
      kind: "vocab_quiz",
      refId: "quiz-toeic",
      outcomes: [{ questionId: word.id, correct: false }],
      occurredAt: newerWrongAt,
    });

    const answerUrl = `/api/v1/vocab/quiz/${session.id}/answers`;
    const answer = { questionId: question.id, optionId: correctOption.id };
    const stale = await request.post(answerUrl, { headers: user.authHeaders, data: answer });
    expect(stale.status()).toBe(410);
    expect((await stale.json()).error.code).toBe("mistake_session_stale");

    const replay = await request.post(answerUrl, { headers: user.authHeaders, data: answer });
    expect(replay.status()).toBe(410);
    const [state] = await testDb
      .select()
      .from(mistakeStates)
      .where(
        and(
          eq(mistakeStates.userId, userId),
          eq(mistakeStates.kind, "vocab_quiz"),
          eq(mistakeStates.refId, "quiz-toeic"),
          eq(mistakeStates.questionId, word.id),
        ),
      );
    expect(state.lastWrongAt).toEqual(newerWrongAt);
    expect(state.clearedAt).toBeNull();
  });

  test("failed writing and speaking submissions are not retryable", async ({ request }) => {
    const user = await apiSignUpAndOnboard(request, "toeic");
    const userId = await userIdFor(request, user.authHeaders);
    const { prompts: writingPrompts } = await (
      await request.get("/api/v1/writing", { headers: user.authHeaders })
    ).json();
    const writingRequestId = crypto.randomUUID();
    const writing = await (
      await request.post(`/api/v1/writing/${writingPrompts[0].id}/submissions`, {
        headers: user.authHeaders,
        data: {
          requestId: writingRequestId,
          text: "This is a sufficiently long response that first enters self assessment mode.",
        },
      })
    ).json();
    await testDb
      .update(writingSubmissions)
      .set({ status: "failed" })
      .where(eq(writingSubmissions.id, writing.submissionId));

    const writingRetryId = crypto.randomUUID();
    const writingRetry = await request.post(
      `/api/v1/writing/submissions/${writing.submissionId}/retry-feedback`,
      { headers: user.authHeaders, data: { requestId: writingRetryId } },
    );
    expect(writingRetry.status()).toBe(404);

    const { prompts: speakingPrompts } = await (
      await request.get("/api/v1/speaking", { headers: user.authHeaders })
    ).json();
    const speaking = await (
      await request.post(`/api/v1/speaking/${speakingPrompts[0].id}/submissions`, {
        headers: user.authHeaders,
        data: {
          requestId: crypto.randomUUID(),
          transcript: "This transcript is long enough to enter self assessment mode for testing.",
          durationSeconds: 30,
        },
      })
    ).json();
    await testDb
      .update(speakingSubmissions)
      .set({ status: "failed" })
      .where(eq(speakingSubmissions.id, speaking.submissionId));

    const speakingRetryId = crypto.randomUUID();
    const speakingRetry = await request.post(
      `/api/v1/speaking/submissions/${speaking.submissionId}/retry-feedback`,
      { headers: user.authHeaders, data: { requestId: speakingRetryId } },
    );
    expect(speakingRetry.status()).toBe(404);

    const claimedRetries = await testDb
      .select({ requestId: aiGradingRequests.requestId })
      .from(aiGradingRequests)
      .where(
        and(
          eq(aiGradingRequests.userId, userId),
          inArray(aiGradingRequests.requestId, [writingRetryId, speakingRetryId]),
        ),
      );
    expect(claimedRetries).toEqual([]);
  });
});
