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

    // Quiz round-trip: one right, one wrong, graded by id equality.
    const quizRes = await request.get("/api/v1/vocab/quiz", { headers: user.authHeaders });
    const quiz = await quizRes.json();
    expect(quiz.track).toBe("toeic");
    expect(quiz.questions.length).toBeGreaterThanOrEqual(2);
    for (const q of quiz.questions) {
      expect(q.options.length).toBe(4);
      expect(q.options.some((o: { wordId: string }) => o.wordId === q.wordId)).toBe(true);
    }

    const [q1, q2] = quiz.questions;
    const wrongOption = q2.options.find((o: { wordId: string }) => o.wordId !== q2.wordId);
    const submitRes = await request.post("/api/v1/vocab/quiz", {
      headers: user.authHeaders,
      data: {
        track: "toeic",
        answers: { [q1.wordId]: q1.wordId, [q2.wordId]: wrongOption.wordId },
      },
    });
    expect(submitRes.status()).toBe(200);
    const result = await submitRes.json();
    expect(result.score).toBe(1);
    expect(result.total).toBe(2);
    expect(result.correctWordIds).toEqual([q1.wordId]);

    // Today's activity shows up as a streak of 1 and a recent quiz score.
    const dashRes = await request.get("/api/v1/dashboard", { headers: user.authHeaders });
    expect(dashRes.status()).toBe(200);
    const dash = await dashRes.json();
    expect(dash.streak).toBe(1);
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
