import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { apiSignUpAndOnboard, type ApiUser } from "./api-helpers";
import type { APIRequestContext } from "@playwright/test";
import type { ExamSection } from "../src/content/types";

function e2eDatabaseUrl(): string {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) return "postgresql://localhost:5432/mercury_e2e";
  const url = new URL(base);
  url.pathname = "/mercury_e2e";
  return url.toString();
}

async function getAttempt(request: APIRequestContext, user: ApiUser, attemptId: string) {
  const res = await request.get(`/api/v1/exams/attempts/${attemptId}`, {
    headers: user.authHeaders,
  });
  expect(res.status()).toBe(200);
  const text = await res.text();
  return { text, body: JSON.parse(text) };
}

test.describe("API mock exam lifecycle", () => {
  test("start → sanitized attempt → guarded autosave → sections → server-graded report", async ({
    request,
  }) => {
    const user = await apiSignUpAndOnboard(request, "toeic");

    // Discover the exam through the API, as the iOS client would.
    const examsRes = await request.get("/api/v1/exams", { headers: user.authHeaders });
    expect(examsRes.status()).toBe(200);
    const examsText = await examsRes.text();
    expect(examsText).not.toContain("correctIndex"); // list is metadata only
    const { exams } = JSON.parse(examsText);
    expect(exams.length).toBeGreaterThan(0);
    const exam = exams[0];
    expect(exam.sections.length).toBeGreaterThanOrEqual(2);

    // Intro exposes section metadata and no attempt yet.
    const introRes = await request.get(`/api/v1/exams/${exam.id}`, { headers: user.authHeaders });
    expect((await introRes.json()).inProgressAttemptId).toBeNull();

    // Idempotent start.
    const start1 = await request.post(`/api/v1/exams/${exam.id}/attempts`, {
      headers: user.authHeaders,
      data: {},
    });
    expect(start1.status()).toBe(200);
    const { attemptId } = await start1.json();
    const start2 = await request.post(`/api/v1/exams/${exam.id}/attempts`, {
      headers: user.authHeaders,
      data: {},
    });
    expect((await start2.json()).attemptId).toBe(attemptId);

    // Live attempt: sanitized sections, a deadline only for section 1.
    const { text: liveText, body: live } = await getAttempt(request, user, attemptId);
    expect(liveText).not.toContain("correctIndex");
    expect(liveText).not.toContain("explanationZh");
    expect(live.status).toBe("in_progress");
    expect(typeof live.serverTime).toBe("number");
    expect(live.sectionDeadlines.length).toBe(1);
    expect(live.sections.length).toBe(exam.sections.length);

    const section1 = live.sections[0];
    const section2 = live.sections[1];
    const s1Questions = section1.groups.flatMap(
      (g: { questions: { id: string }[] }) => g.questions,
    );
    const s2FirstQid = section2.groups[0].questions[0].id;

    // Mid-exam key-extraction guard: the retest endpoint refuses questions
    // that are not derived active mistakes (this attempt is not completed).
    const steal = await request.post("/api/v1/mistakes/retest", {
      headers: user.authHeaders,
      data: { kind: "exam", refId: exam.id, questionId: s1Questions[0].id, chosenIndex: 0 },
    });
    expect(steal.status()).toBe(403);
    expect((await steal.json()).error.code).toBe("integrity");

    // Autosave: a bogus id and a section-2 id are both silently dropped.
    const patch = await request.patch(`/api/v1/exams/attempts/${attemptId}/answers`, {
      headers: user.authHeaders,
      data: { answers: { [s1Questions[0].id]: 1, "bogus-question": 2, [s2FirstQid]: 3 } },
    });
    expect(patch.status()).toBe(204);
    const { body: afterSave } = await getAttempt(request, user, attemptId);
    expect(afterSave.answers).toEqual({ [s1Questions[0].id]: 1 });

    // Submit section 1: not done, section 2's deadline is stamped server-side.
    const s1Answers: Record<string, number> = {};
    for (const q of s1Questions) s1Answers[q.id] = 0;
    const submit1 = await request.post(
      `/api/v1/exams/attempts/${attemptId}/sections/${section1.id}/submit`,
      { headers: user.authHeaders, data: { answers: s1Answers } },
    );
    expect(submit1.status()).toBe(200);
    const submit1Body = await submit1.json();
    expect(submit1Body.done).toBe(false);
    expect(submit1Body.nextSectionIndex).toBe(1);
    expect(submit1Body.deadlines.length).toBe(2);

    // Submit the final section: the server grades everything.
    const s2Answers: Record<string, number> = {};
    for (const g of section2.groups) for (const q of g.questions) s2Answers[q.id] = 0;
    const submit2 = await request.post(
      `/api/v1/exams/attempts/${attemptId}/sections/${section2.id}/submit`,
      { headers: user.authHeaders, data: { answers: s2Answers } },
    );
    expect(submit2.status()).toBe(200);
    expect((await submit2.json()).done).toBe(true);

    // Completed report: keys are now legitimately present in the review, and
    // the server-side score matches what the review + stored answers imply.
    const { text: reportText, body: report } = await getAttempt(request, user, attemptId);
    expect(report.status).toBe("completed");
    expect(reportText).toContain("correctIndex");
    expect(report.estimate.kind).toBe("toeic");

    let expected = 0;
    for (const section of report.review) {
      for (const group of section.groups) {
        for (const q of group.questions) {
          if (report.answers[q.id] === q.correctIndex) expected += 1;
        }
      }
    }
    expect(report.rawScore).toBe(expected);
    expect(report.totalQuestions).toBe(exam.totalQuestions);

    // The intro now shows no resumable attempt.
    const introAfter = await request.get(`/api/v1/exams/${exam.id}`, {
      headers: user.authHeaders,
    });
    expect((await introAfter.json()).inProgressAttemptId).toBeNull();
  });

  test("another user's attempt is invisible (404)", async ({ request }) => {
    const alice = await apiSignUpAndOnboard(request, "toeic");
    const { exams } = await (
      await request.get("/api/v1/exams", { headers: alice.authHeaders })
    ).json();
    const start = await request.post(`/api/v1/exams/${exams[0].id}/attempts`, {
      headers: alice.authHeaders,
      data: {},
    });
    const { attemptId } = await start.json();

    const mallory = await apiSignUpAndOnboard(request, "toeic");
    const res = await request.get(`/api/v1/exams/attempts/${attemptId}`, {
      headers: mallory.authHeaders,
    });
    expect(res.status()).toBe(404);
  });

  test("abandonment hides saved state and permits a fresh attempt", async ({ request }) => {
    const user = await apiSignUpAndOnboard(request, "toeic");
    const { exams } = await (
      await request.get("/api/v1/exams", { headers: user.authHeaders })
    ).json();
    const exam = exams[0];
    const firstStart = await request.post(`/api/v1/exams/${exam.id}/attempts`, {
      headers: user.authHeaders,
      data: {},
    });
    const { attemptId } = await firstStart.json();

    const abandoned = await request.post(`/api/v1/exams/attempts/${attemptId}/abandon`, {
      headers: user.authHeaders,
      data: {},
    });
    expect(abandoned.status()).toBe(200);
    expect(await abandoned.json()).toEqual({ status: "abandoned" });

    // Repeating the command is safe, and the public resource exposes metadata only.
    const repeated = await request.post(`/api/v1/exams/attempts/${attemptId}/abandon`, {
      headers: user.authHeaders,
      data: {},
    });
    expect(repeated.status()).toBe(200);
    const { text, body } = await getAttempt(request, user, attemptId);
    expect(body.status).toBe("abandoned");
    expect(text).not.toContain("answers");
    expect(text).not.toContain("correctIndex");
    expect(text).not.toContain("review");

    const secondStart = await request.post(`/api/v1/exams/${exam.id}/attempts`, {
      headers: user.authHeaders,
      data: {},
    });
    expect(secondStart.status()).toBe(200);
    expect((await secondStart.json()).attemptId).not.toBe(attemptId);
  });

  test("attempt grading and review survive a live content edit", async ({ request }) => {
    const user = await apiSignUpAndOnboard(request, "toeic");
    const { exams } = await (
      await request.get("/api/v1/exams", { headers: user.authHeaders })
    ).json();
    const exam = exams[0];
    const pool = new Pool({ connectionString: e2eDatabaseUrl(), max: 1 });
    const stored = await pool.query<{ sections: ExamSection[] }>(
      "select sections from mock_exams where id = $1",
      [exam.id],
    );
    const originalSections = stored.rows[0].sections;
    const mutatedSections = structuredClone(originalSections);
    const originalQuestion = originalSections[0].groups[0].questions[0];
    const mutatedQuestion = mutatedSections[0].groups[0].questions[0];
    mutatedQuestion.stem = "MUTATED AFTER ATTEMPT START";
    mutatedQuestion.correctIndex = (originalQuestion.correctIndex + 1) % 4;

    const start = await request.post(`/api/v1/exams/${exam.id}/attempts`, {
      headers: user.authHeaders,
      data: {},
    });
    const { attemptId } = await start.json();

    try {
      await pool.query("update mock_exams set sections = $1 where id = $2", [
        JSON.stringify(mutatedSections),
        exam.id,
      ]);

      const { text: liveText } = await getAttempt(request, user, attemptId);
      expect(liveText).not.toContain("MUTATED AFTER ATTEMPT START");

      for (const section of originalSections) {
        const answers: Record<string, number> = {};
        for (const group of section.groups) {
          for (const question of group.questions) answers[question.id] = question.correctIndex;
        }
        const submit = await request.post(
          `/api/v1/exams/attempts/${attemptId}/sections/${section.id}/submit`,
          { headers: user.authHeaders, data: { answers } },
        );
        expect(submit.status()).toBe(200);
      }

      const { text: reportText, body: report } = await getAttempt(request, user, attemptId);
      expect(report.status).toBe("completed");
      expect(report.rawScore).toBe(report.totalQuestions);
      expect(reportText).not.toContain("MUTATED AFTER ATTEMPT START");
      expect(report.review[0].groups[0].questions[0].correctIndex).toBe(
        originalQuestion.correctIndex,
      );
    } finally {
      await pool.query("update mock_exams set sections = $1 where id = $2", [
        JSON.stringify(originalSections),
        exam.id,
      ]);
      await pool.end();
    }
  });
});
