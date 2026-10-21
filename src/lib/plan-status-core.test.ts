import { describe, expect, test } from "bun:test";
import type { PlanItem } from "./plan-core";
import {
  derivePlanStops,
  EMPTY_FACTS,
  factNeeds,
  locateStop,
  mergeRegeneratedItems,
  planItemKey,
  summarizeRoute,
  type PlanFacts,
} from "./plan-status-core";

const vocab: PlanItem = {
  kind: "vocab_review",
  href: "/vocabulary/study",
  estMinutes: 6,
  reasonKey: "dueVocab",
  target: 5,
};
const reading: PlanItem = {
  kind: "reading",
  refId: "r-1",
  href: "/reading/r-1",
  estMinutes: 8,
  reasonKey: "weakSkill",
};
const mistakes: PlanItem = {
  kind: "mistakes",
  href: "/mistakes",
  estMinutes: 5,
  reasonKey: "clearMistakes",
  target: 3,
};
const speaking: PlanItem = {
  kind: "speaking",
  refId: "s-1",
  href: "/speaking/s-1",
  estMinutes: 10,
  reasonKey: "speakingCadence",
};
const PLAN = [vocab, reading, mistakes, speaking];

const facts = (patch: Partial<PlanFacts>): PlanFacts => ({ ...EMPTY_FACTS, ...patch });
const none = new Set<string>();

describe("derivePlanStops", () => {
  test("a fresh day: the first stop is current, the rest open", () => {
    const stops = derivePlanStops(PLAN, EMPTY_FACTS, none);
    expect(stops.map((s) => s.status)).toEqual(["current", "open", "open", "open"]);
    expect(stops[0].key).toBe("vocab_review:");
    expect(stops[1].key).toBe("reading:r-1");
  });

  test("count stops are done at their target and show partial progress before", () => {
    const partial = derivePlanStops(PLAN, facts({ vocabReviewedExisting: 2 }), none);
    expect(partial[0]).toMatchObject({
      status: "current",
      started: true,
      progress: { type: "count", done: 2, target: 5 },
    });
    const done = derivePlanStops(PLAN, facts({ vocabReviewedExisting: 7 }), none);
    expect(done[0]).toMatchObject({ status: "done", progress: { done: 5, target: 5 } });
    expect(done[1].status).toBe("current");
  });

  test("only the planned exercise counts, and carries its score", () => {
    const other = derivePlanStops(
      PLAN,
      facts({ exercises: new Map([["reading:r-2", { score: 3, total: 3 }]]) }),
      none,
    );
    expect(other[1].status).not.toBe("done");
    const planned = derivePlanStops(
      PLAN,
      facts({ exercises: new Map([["reading:r-1", { score: 2, total: 3 }]]) }),
      none,
    );
    expect(planned[1]).toMatchObject({
      status: "done",
      progress: { type: "score", score: 2, total: 3 },
    });
  });

  test("done beats skipped; skipped stops never become current", () => {
    const skipped = new Set([planItemKey(vocab), planItemKey(reading)]);
    const stops = derivePlanStops(
      PLAN,
      facts({ exercises: new Map([["reading:r-1", { score: 1, total: 3 }]]) }),
      skipped,
    );
    expect(stops.map((s) => s.status)).toEqual(["skipped", "done", "current", "open"]);
  });

  test("an exam in progress is started, with its section position", () => {
    const exam: PlanItem = {
      kind: "mock_exam",
      refId: "e-1",
      href: "/exams/e-1",
      estMinutes: 30,
      reasonKey: "examCheckpoint",
    };
    const [stop] = derivePlanStops(
      [exam],
      facts({ exams: new Map([["e-1", { status: "in_progress", section: 1, sections: 3 }]]) }),
      none,
    );
    expect(stop).toMatchObject({
      status: "current",
      started: true,
      progress: { type: "exam", section: 2, sections: 3 },
    });
  });
});

describe("summarizeRoute", () => {
  test("counts done against non-skipped stops and sums the remaining minutes", () => {
    const stops = derivePlanStops(
      PLAN,
      facts({ vocabReviewedExisting: 5 }),
      new Set([planItemKey(speaking)]),
    );
    expect(summarizeRoute(stops)).toEqual({
      done: 1,
      total: 3,
      currentKey: "reading:r-1",
      allDone: false,
      remainingMinutes: 13,
      totalMinutes: 29,
    });
  });

  test("all done needs at least one finished stop, not just skips", () => {
    const allSkipped = derivePlanStops(PLAN, EMPTY_FACTS, new Set(PLAN.map(planItemKey)));
    expect(summarizeRoute(allSkipped).allDone).toBe(false);
    const finished = derivePlanStops(
      [vocab, speaking],
      facts({ vocabReviewedExisting: 5 }),
      new Set([planItemKey(speaking)]),
    );
    expect(summarizeRoute(finished)).toMatchObject({ allDone: true, currentKey: null });
  });
});

describe("locateStop", () => {
  test("finds the session's stop and the next unfinished one after it", () => {
    const stops = derivePlanStops(PLAN, EMPTY_FACTS, none);
    const found = locateStop(stops, { kind: "vocab" });
    expect(found?.index).toBe(0);
    expect(found?.next?.key).toBe("reading:r-1");
  });

  test("wraps to an earlier unfinished stop, and returns null off-plan", () => {
    const stops = derivePlanStops(PLAN, facts({ mistakesClearedToday: 0 }), none);
    const last = locateStop(stops, { kind: "speaking", refId: "s-1" });
    expect(last?.index).toBe(3);
    expect(last?.next?.key).toBe("vocab_review:");
    expect(locateStop(stops, { kind: "reading", refId: "elsewhere" })).toBeNull();
  });

  test("with a finished review and new words both on the route, the study page is the open stop", () => {
    // A regenerated plan kept the done vocab review and added new words;
    // both are served by /vocabulary/study.
    const newWords: PlanItem = {
      kind: "vocab_new",
      href: "/vocabulary/study",
      estMinutes: 10,
      reasonKey: "newWords",
      target: 10,
    };
    const stops = derivePlanStops(
      [vocab, reading, newWords],
      facts({ vocabReviewedExisting: 5 }),
      none,
    );
    const found = locateStop(stops, { kind: "vocab" });
    expect(found?.stop.key).toBe("vocab_new:");
    expect(found?.index).toBe(2);
    // Next is never the other vocab stop, which would lead back to this page.
    expect(found?.next?.key).toBe("reading:r-1");

    const readingDone = derivePlanStops(
      [vocab, reading, newWords],
      facts({
        vocabReviewedExisting: 5,
        exercises: new Map([["reading:r-1", { score: 3, total: 4 }]]),
      }),
      none,
    );
    expect(locateStop(readingDone, { kind: "vocab" })?.next).toBeNull();
  });
});

describe("mergeRegeneratedItems", () => {
  test("keeps done, skipped, and started stops; fills the rest with fresh items", () => {
    const stops = derivePlanStops(
      PLAN,
      facts({ vocabReviewedExisting: 5, mistakesClearedToday: 1 }),
      new Set([planItemKey(speaking)]),
    );
    const fresh: PlanItem[] = [
      { ...reading, refId: "r-9", href: "/reading/r-9" },
      vocab,
      {
        kind: "listening",
        refId: "l-1",
        href: "/listening/l-1",
        estMinutes: 8,
        reasonKey: "weakSkill",
      },
    ];
    const merged = mergeRegeneratedItems(stops, fresh);
    expect(merged.map(planItemKey)).toEqual([
      "vocab_review:",
      "mistakes:",
      "speaking:s-1",
      "reading:r-9",
      "listening:l-1",
    ]);
    // Derived fields never leak into the stored snapshot.
    expect(Object.keys(merged[0])).not.toContain("status");
  });
});

describe("factNeeds", () => {
  test("lists only the facts the plan's kinds need", () => {
    expect(factNeeds(PLAN)).toEqual({
      vocab: true,
      mistakes: true,
      exercises: [{ kind: "reading", refId: "r-1" }],
      writing: [],
      speaking: ["s-1"],
      books: [],
      exams: [],
    });
  });
});
