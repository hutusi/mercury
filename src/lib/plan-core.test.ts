import { describe, expect, test } from "bun:test";
import { defaultSkillEstimates } from "./learner-model-core";
import { buildDailyPlan, practiceOrder, type PlanInput } from "./plan-core";

const NOW = new Date("2026-07-12T10:00:00");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

function baseInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    profile: {
      dailyMinutes: 20,
      examDate: null,
      skillEstimates: defaultSkillEstimates("intermediate", NOW),
    },
    track: "toeic",
    dueCount: 0,
    freshCount: 50,
    activeMistakes: 0,
    recent: { lastWritingAt: null, lastSpeakingAt: null, lastExamAt: null },
    available: {
      reading: [
        { id: "r-1", suggestedMinutes: 8, attempted: true },
        { id: "r-2", suggestedMinutes: 8, attempted: false },
      ],
      listening: [{ id: "l-1", attempted: false }],
      writing: { id: "w-1", suggestedMinutes: 20 },
      speaking: { id: "s-1" },
      examId: "exam-1",
      bookChapter: null,
    },
    today: NOW,
    ...overrides,
  };
}

describe("practiceOrder", () => {
  test("sorts weakest skill first with a stable tiebreak", () => {
    const estimates = defaultSkillEstimates("intermediate", NOW);
    estimates.listening = { ...estimates.listening, estimate: 30 };
    expect(practiceOrder(estimates)[0]).toBe("listening");
    // All equal → fixed product order.
    expect(practiceOrder(defaultSkillEstimates("intermediate", NOW))).toEqual([
      "reading",
      "listening",
      "writing",
      "speaking",
      "vocab",
    ]);
  });
});

describe("buildDailyPlan", () => {
  test("fresh account: new words plus practice, never empty", () => {
    const items = buildDailyPlan(baseInput());
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toMatchObject({ kind: "vocab_new", reasonKey: "newWords" });
    expect(items.some((i) => i.kind === "reading" || i.kind === "listening")).toBe(true);
  });

  test("everything done: the plan is genuinely empty — the completion contract", () => {
    // No due vocab, no fresh words, no mistakes, all exercises attempted,
    // cadences satisfied today, no book in progress → the dashboard renders
    // its completion card off items.length === 0.
    const input = baseInput({
      dueCount: 0,
      freshCount: 0,
      activeMistakes: 0,
    });
    input.available.reading = input.available.reading.map((e) => ({ ...e, attempted: true }));
    input.available.listening = input.available.listening.map((e) => ({ ...e, attempted: true }));
    input.recent.lastWritingAt = input.today;
    input.recent.lastSpeakingAt = input.today;
    input.recent.lastExamAt = input.today;
    expect(buildDailyPlan(input)).toEqual([]);
  });

  test("due vocab always leads and unattempted exercises are preferred", () => {
    const items = buildDailyPlan(baseInput({ dueCount: 12 }));
    expect(items[0]).toMatchObject({ kind: "vocab_review", reasonKey: "dueVocab", estMinutes: 6 });
    const reading = items.find((i) => i.kind === "reading");
    expect(reading?.refId).toBe("r-2");
  });

  test("mistakes retest comes right after vocab", () => {
    const items = buildDailyPlan(baseInput({ dueCount: 4, activeMistakes: 5 }));
    expect(items[1]).toMatchObject({ kind: "mistakes", href: "/mistakes", estMinutes: 5 });
  });

  test("an in-progress book slots after mistakes and before skill practice", () => {
    const items = buildDailyPlan(
      baseInput({
        dueCount: 4,
        activeMistakes: 3,
        available: {
          ...baseInput().available,
          bookChapter: { bookId: "book-oz", chapterId: "oz-ch-02", estMinutes: 12 },
        },
      }),
    );
    expect(items.map((i) => i.kind).slice(0, 3)).toEqual([
      "vocab_review",
      "mistakes",
      "book_chapter",
    ]);
    expect(items[2]).toMatchObject({
      refId: "oz-ch-02",
      href: "/books/book-oz/chapters/oz-ch-02",
      estMinutes: 12,
      reasonKey: "continueBook",
    });
  });

  test("no book item without an in-progress book — fresh accounts unchanged", () => {
    // The plan continues books, it never starts them (bookChapter is null
    // until a first quiz attempt exists).
    expect(buildDailyPlan(baseInput()).some((i) => i.kind === "book_chapter")).toBe(false);
  });

  test("the book item competes inside the minutes budget", () => {
    const items = buildDailyPlan(
      baseInput({
        dueCount: 30,
        activeMistakes: 10,
        available: {
          ...baseInput().available,
          bookChapter: { bookId: "book-oz", chapterId: "oz-ch-02", estMinutes: 12 },
        },
      }),
    );
    // 15 (vocab) + 10 (mistakes) = 25 ≥ 20 → the budget closes before the book.
    expect(items.map((i) => i.kind)).toEqual(["vocab_review", "mistakes"]);
  });

  test("weakest skill drives practice choice", () => {
    const estimates = defaultSkillEstimates("intermediate", NOW);
    estimates.listening = { ...estimates.listening, estimate: 20 };
    const items = buildDailyPlan(
      baseInput({ profile: { ...baseInput().profile!, skillEstimates: estimates } }),
    );
    const firstPractice = items.find((i) =>
      ["reading", "listening", "writing", "speaking"].includes(i.kind),
    );
    expect(firstPractice?.kind).toBe("listening");
  });

  test("writing joins on cadence but is promoted when weakest", () => {
    // Wrote yesterday → not due, no writing item.
    const recentWrite = buildDailyPlan(
      baseInput({
        dueCount: 2,
        recent: { lastWritingAt: daysAgo(1), lastSpeakingAt: daysAgo(1), lastExamAt: null },
      }),
    );
    expect(recentWrite.some((i) => i.kind === "writing")).toBe(false);

    // Weakest skill = writing and cadence due → promoted with weakSkill reason.
    const estimates = defaultSkillEstimates("intermediate", NOW);
    estimates.writing = { ...estimates.writing, estimate: 10 };
    const weakWriting = buildDailyPlan(
      baseInput({ profile: { ...baseInput().profile!, skillEstimates: estimates } }),
    );
    const writing = weakWriting.find((i) => i.kind === "writing");
    expect(writing?.reasonKey).toBe("weakSkill");
  });

  test("respects the daily minutes budget with the last item overshooting", () => {
    const items = buildDailyPlan(baseInput({ dueCount: 30, activeMistakes: 10 }));
    // 15 (vocab) + 10 (mistakes) = 25 ≥ 20 → stop at two items.
    expect(items.map((i) => i.kind)).toEqual(["vocab_review", "mistakes"]);
  });

  test("exam checkpoint appends outside the budget as the exam approaches", () => {
    const input = baseInput({
      dueCount: 30,
      activeMistakes: 10,
      profile: { ...baseInput().profile!, examDate: "2026-08-01" }, // 20 days out → 3-day spacing
    });
    const items = buildDailyPlan(input);
    expect(items.at(-1)).toMatchObject({ kind: "mock_exam", reasonKey: "examCheckpoint" });

    // A mock taken yesterday suppresses it.
    const recent = buildDailyPlan({
      ...input,
      recent: { ...input.recent, lastExamAt: daysAgo(1) },
    });
    expect(recent.some((i) => i.kind === "mock_exam")).toBe(false);

    // Far from the exam (>28 days) the spacing is weekly.
    const far = buildDailyPlan({
      ...input,
      profile: { ...input.profile!, examDate: "2026-10-01" },
      recent: { ...input.recent, lastExamAt: daysAgo(5) },
    });
    expect(far.some((i) => i.kind === "mock_exam")).toBe(false);
  });

  test("no exam checkpoint on the business track", () => {
    const input = baseInput({
      profile: { ...baseInput().profile!, examDate: "2026-08-01" },
      track: "business",
      available: { ...baseInput().available, examId: null },
    });
    expect(buildDailyPlan(input).some((i) => i.kind === "mock_exam")).toBe(false);
  });

  test("caps at five items", () => {
    const items = buildDailyPlan(
      baseInput({
        dueCount: 1,
        activeMistakes: 1,
        profile: { ...baseInput().profile!, dailyMinutes: 180, examDate: "2026-08-01" },
      }),
    );
    expect(items.length).toBeLessThanOrEqual(5);
  });
});
