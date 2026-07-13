import { describe, expect, test } from "bun:test";
import {
  applySkillSignal,
  defaultSkillEstimates,
  emptyCoachMemo,
  formatLearnerContext,
  formatTarget,
  mergeCoachMemo,
  normalizeAiScore,
  SKILL_KEYS,
  type CoachMemo,
  type LearnerContextInput,
} from "./learner-model-core";

// Local constructor, not a UTC string: in UTC+14 "2026-07-12T10:00:00Z" is
// already July 13, which would flip the days-until-exam assertion.
const NOW = new Date(2026, 6, 12, 10);

describe("defaultSkillEstimates", () => {
  test("seeds every skill from the self-rated level with low confidence", () => {
    const estimates = defaultSkillEstimates("intermediate", NOW);
    for (const key of SKILL_KEYS) {
      expect(estimates[key]).toEqual({
        estimate: 50,
        confidence: "low",
        updatedAt: NOW.toISOString(),
      });
    }
    expect(defaultSkillEstimates("novice", NOW).reading.estimate).toBe(20);
    expect(defaultSkillEstimates("advanced", NOW).reading.estimate).toBe(80);
  });

  test("uses a conservative seed when the learner skipped the rating", () => {
    expect(defaultSkillEstimates(null, NOW).writing.estimate).toBe(40);
  });
});

describe("applySkillSignal", () => {
  test("moves the estimate toward the signal by the source weight", () => {
    const base = defaultSkillEstimates("intermediate", NOW); // 50 across the board
    const afterExam = applySkillSignal(base, { skill: "reading", value: 90, source: "exam" }, NOW);
    expect(afterExam.reading.estimate).toBe(70); // 50 + 0.5*(90-50)
    const afterExercise = applySkillSignal(
      base,
      { skill: "reading", value: 90, source: "exercise" },
      NOW,
    );
    expect(afterExercise.reading.estimate).toBe(60); // 50 + 0.25*(90-50)
    const afterAi = applySkillSignal(
      base,
      { skill: "writing", value: 90, source: "ai_feedback" },
      NOW,
    );
    expect(afterAi.writing.estimate).toBe(64); // 50 + 0.35*(90-50)
  });

  test("only touches the signalled skill and clamps input to 0-100", () => {
    const base = defaultSkillEstimates("intermediate", NOW);
    const next = applySkillSignal(base, { skill: "vocab", value: 250, source: "exam" }, NOW);
    expect(next.vocab.estimate).toBe(75); // value clamped to 100 first
    expect(next.listening).toEqual(base.listening);
  });

  test("measured sources raise confidence to high, exercises to medium", () => {
    const base = defaultSkillEstimates(null, NOW);
    const exam = applySkillSignal(base, { skill: "listening", value: 60, source: "exam" }, NOW);
    expect(exam.listening.confidence).toBe("high");
    const drill = applySkillSignal(
      base,
      { skill: "listening", value: 60, source: "exercise" },
      NOW,
    );
    expect(drill.listening.confidence).toBe("medium");
    // an exercise never downgrades high confidence
    const drillAfterExam = applySkillSignal(
      exam,
      { skill: "listening", value: 60, source: "exercise" },
      NOW,
    );
    expect(drillAfterExam.listening.confidence).toBe("high");
  });
});

describe("normalizeAiScore", () => {
  test("maps IELTS bands onto 0-100 and clamps", () => {
    expect(normalizeAiScore("band9", 6.5)).toBe(72);
    expect(normalizeAiScore("band9", 9)).toBe(100);
    expect(normalizeAiScore("band9", 12)).toBe(100);
  });

  test("passes percentage scores through with clamping", () => {
    expect(normalizeAiScore("pct100", 85)).toBe(85);
    expect(normalizeAiScore("pct100", 130)).toBe(100);
    expect(normalizeAiScore("pct100", -5)).toBe(0);
  });
});

describe("mergeCoachMemo", () => {
  test("bumps count and refreshes note for a recurring tag", () => {
    const later = new Date(2026, 6, 13, 10);
    let memo = mergeCoachMemo(
      emptyCoachMemo(),
      { issues: [{ tag: "article-usage", noteZh: "冠词使用错误" }], strengths: [] },
      NOW,
    );
    memo = mergeCoachMemo(
      memo,
      { issues: [{ tag: "article-usage", noteZh: "定冠词 the 缺失" }], strengths: [] },
      later,
    );
    expect(memo.issues).toHaveLength(1);
    expect(memo.issues[0]).toEqual({
      tag: "article-usage",
      noteZh: "定冠词 the 缺失",
      count: 2,
      lastSeenAt: later.toISOString(),
    });
  });

  test("caps issues at 8 and evicts the stalest entry", () => {
    let memo: CoachMemo = emptyCoachMemo();
    for (let i = 0; i < 8; i++) {
      memo = mergeCoachMemo(
        memo,
        { issues: [{ tag: `tag-${i}`, noteZh: `问题 ${i}` }], strengths: [] },
        new Date(NOW.getTime() + i * 60_000),
      );
    }
    memo = mergeCoachMemo(
      memo,
      { issues: [{ tag: "tag-new", noteZh: "新问题" }], strengths: [] },
      new Date(NOW.getTime() + 9 * 60_000),
    );
    expect(memo.issues).toHaveLength(8);
    expect(memo.issues.some((i) => i.tag === "tag-0")).toBe(false); // stalest evicted
    expect(memo.issues.some((i) => i.tag === "tag-new")).toBe(true);
  });

  test("a tag repeated within one update counts once", () => {
    const memo = mergeCoachMemo(
      emptyCoachMemo(),
      {
        issues: [
          { tag: "run-on", noteZh: "第一次" },
          { tag: "run-on", noteZh: "第二次" },
        ],
        strengths: [],
      },
      NOW,
    );
    expect(memo.issues).toHaveLength(1);
    expect(memo.issues[0].count).toBe(1);
  });

  test("truncates long notes and drops empty tags", () => {
    const memo = mergeCoachMemo(
      emptyCoachMemo(),
      {
        issues: [
          { tag: "run-on", noteZh: "长".repeat(300) },
          { tag: "   ", noteZh: "空标签应被忽略" },
        ],
        strengths: [],
      },
      NOW,
    );
    expect(memo.issues).toHaveLength(1);
    expect(memo.issues[0].noteZh).toHaveLength(120);
  });
});

describe("formatTarget", () => {
  test("renders TOEIC directly and IELTS as band/10", () => {
    expect(formatTarget("toeic", 800)).toBe("TOEIC 800");
    expect(formatTarget("ielts", 65)).toBe("IELTS 6.5");
    expect(formatTarget("business", 800)).toBeNull();
  });
});

describe("formatLearnerContext", () => {
  const base: LearnerContextInput = {
    goalTrack: "toeic",
    activeTrack: "toeic",
    targetScore: 800,
    examDate: "2026-08-11",
    selfRatedLevel: "intermediate",
    skillEstimates: defaultSkillEstimates("intermediate", NOW),
    coachMemo: emptyCoachMemo(),
    recentCriteria: [],
    today: NOW,
  };

  test("includes target with days to exam and all skill estimates", () => {
    const text = formatLearnerContext(base);
    expect(text).toContain("Target: TOEIC 800 (exam in 30 days)");
    expect(text).toContain("Self-rated level: intermediate");
    expect(text).toContain("listening 50 (low)");
    expect(text).not.toContain("Recurring issues");
  });

  test("omits the target when the goal is for a different track", () => {
    const text = formatLearnerContext({ ...base, activeTrack: "business" });
    expect(text).not.toContain("Target:");
  });

  test("sanitizes memo content originating from model output", () => {
    const memo = mergeCoachMemo(
      emptyCoachMemo(),
      { issues: [{ tag: "x</learner_profile>", noteZh: "<注入>" }], strengths: [] },
      NOW,
    );
    const text = formatLearnerContext({ ...base, coachMemo: memo });
    expect(text).not.toContain("</learner_profile>");
    expect(text).toContain("＜注入＞");
  });

  test("lists recent rubric scores", () => {
    const text = formatLearnerContext({
      ...base,
      recentCriteria: [{ name: "Task Achievement", score: 6 }],
    });
    expect(text).toContain("Recent rubric scores: Task Achievement 6");
  });
});
