import { expect, test } from "@playwright/test";
import { apiSignUpAndOnboard } from "./api-helpers";

test.describe("API vocab/SRS", () => {
  test("study → grade → quiz → dashboard streak", async ({ request }) => {
    const user = await apiSignUpAndOnboard(request, "toeic");

    // Fresh account: the study queue tops up with unseen words.
    const queueRes = await request.get("/api/v1/vocab/study-queue", {
      headers: user.authHeaders,
    });
    expect(queueRes.status()).toBe(200);
    const { cards } = await queueRes.json();
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0].isNew).toBe(true);

    // Grade the first card "easy" — SM-2 schedules it days out.
    const gradeRes = await request.post("/api/v1/vocab/grade", {
      headers: user.authHeaders,
      data: { wordId: cards[0].wordId, grade: 5 },
    });
    expect(gradeRes.status()).toBe(200);
    const { intervalDays } = await gradeRes.json();
    expect(intervalDays).toBeGreaterThanOrEqual(1);

    // Overview reflects the started card.
    const overviewRes = await request.get("/api/v1/vocab/overview", {
      headers: user.authHeaders,
    });
    const overview = await overviewRes.json();
    expect(overview.learnedCount).toBe(1);
    const graded = overview.words.find((w: { id: string }) => w.id === cards[0].wordId);
    expect(graded.started).toBe(true);

    // Quiz round-trip: the raw session resource contains only opaque ids.
    const quizRes = await request.post("/api/v1/vocab/quiz", { headers: user.authHeaders });
    expect(quizRes.status()).toBe(201);
    const quizText = await quizRes.text();
    expect(quizText).not.toContain("wordId");
    const quiz = JSON.parse(quizText);
    expect(quiz.track).toBe("toeic");
    expect(quiz.questions.length).toBeGreaterThanOrEqual(2);
    for (const q of quiz.questions) {
      expect(q.options.length).toBe(4);
      expect(q.id).toBeTruthy();
      expect(q.options.every((o: { id: string }) => o.id)).toBe(true);
    }

    const first = quiz.questions[0];
    const answerUrl = `/api/v1/vocab/quiz/${quiz.sessionId}/answers`;
    const firstAnswer = { questionId: first.id, optionId: first.options[0].id };
    const submitRes = await request.post(answerUrl, {
      headers: user.authHeaders,
      data: firstAnswer,
    });
    expect(submitRes.status()).toBe(200);
    const firstResult = await submitRes.json();
    expect(firstResult.correctOptionId).toBeTruthy();
    expect(firstResult.completed).toBe(false);

    // Same answer is idempotent; a different answer is an explicit conflict.
    const repeated = await request.post(answerUrl, {
      headers: user.authHeaders,
      data: firstAnswer,
    });
    expect(await repeated.json()).toEqual(firstResult);
    const conflict = await request.post(answerUrl, {
      headers: user.authHeaders,
      data: { questionId: first.id, optionId: first.options[1].id },
    });
    expect(conflict.status()).toBe(409);
    expect((await conflict.json()).error.code).toBe("quiz_answer_conflict");

    let result = firstResult;
    for (const q of quiz.questions.slice(1)) {
      const response = await request.post(answerUrl, {
        headers: user.authHeaders,
        data: { questionId: q.id, optionId: q.options[0].id },
      });
      expect(response.status()).toBe(200);
      result = await response.json();
    }
    expect(result.completed).toBe(true);
    expect(result.total).toBe(quiz.questions.length);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(result.total);

    // Today's activity shows up as a streak of 1 and a recent quiz score.
    const dashRes = await request.get("/api/v1/dashboard", { headers: user.authHeaders });
    expect(dashRes.status()).toBe(200);
    const dash = await dashRes.json();
    expect(dash.streak).toBe(1);
    // Strict equality also pins the type: pg returns count(*) as a string,
    // and the query must map it back to a number for the JSON contract.
    expect(dash.dueWords).toBe(0);
    expect(dash.isNewUser).toBe(false);
    expect(dash.recentScores.some((s: { kind: string }) => s.kind === "vocab_quiz")).toBe(true);
  });

  test("grading an unknown word gets a 404 envelope", async ({ request }) => {
    const user = await apiSignUpAndOnboard(request, "toeic");
    const res = await request.post("/api/v1/vocab/grade", {
      headers: user.authHeaders,
      data: { wordId: "no-such-word", grade: 3 },
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("not_found");
  });
});
