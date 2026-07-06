import { describe, expect, test } from "bun:test";
import {
  deriveMistakes,
  sourceKey,
  type AnswerKeyMap,
  type ClearInput,
  type CoreAttempt,
} from "./mistakes-core";

const t = (minutes: number) => new Date(2026, 0, 1, 10, minutes);

/** Reading exercise "r1" with q1 correct=1, q2 correct=2. */
function keys(): AnswerKeyMap {
  return new Map([
    [
      sourceKey("reading", "r1"),
      new Map([
        ["q1", 1],
        ["q2", 2],
      ]),
    ],
    [
      sourceKey("exam", "e1"),
      new Map([
        ["x1", 0],
        ["x2", 3],
      ]),
    ],
  ]);
}

function reading(minute: number, answers: Record<string, number>): CoreAttempt {
  return { kind: "reading", refId: "r1", completedAt: t(minute), answers };
}

function clear(minute: number, questionId: string, refId = "r1"): ClearInput {
  return { kind: "reading", refId, questionId, clearedAt: t(minute) };
}

describe("deriveMistakes", () => {
  test("a wrong answer produces an active mistake", () => {
    const out = deriveMistakes([reading(0, { q1: 0, q2: 2 })], keys(), []);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ questionId: "q1", wrongCount: 1, cleared: false });
  });

  test("a correct answer in a later attempt resolves the mistake", () => {
    const out = deriveMistakes(
      [reading(0, { q1: 0, q2: 2 }), reading(5, { q1: 1, q2: 2 })],
      keys(),
      [],
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ questionId: "q1", cleared: true });
  });

  test("correct first, wrong later stays active", () => {
    const out = deriveMistakes(
      [reading(0, { q1: 1, q2: 2 }), reading(5, { q1: 0, q2: 2 })],
      keys(),
      [],
    );
    expect(out[0]).toMatchObject({ questionId: "q1", cleared: false });
  });

  test("a clear resolves; a later wrong revives with wrongCount 2", () => {
    const attempts = [reading(0, { q1: 0, q2: 2 })];
    const cleared = deriveMistakes(attempts, keys(), [clear(1, "q1")]);
    expect(cleared[0]).toMatchObject({ questionId: "q1", cleared: true });

    const revived = deriveMistakes([...attempts, reading(5, { q1: 3, q2: 2 })], keys(), [
      clear(1, "q1"),
    ]);
    expect(revived[0]).toMatchObject({ questionId: "q1", wrongCount: 2, cleared: false });
  });

  test("a clear at the same instant as the wrong resolves (tie rule)", () => {
    const out = deriveMistakes([reading(0, { q1: 0, q2: 2 })], keys(), [clear(0, "q1")]);
    expect(out[0]).toMatchObject({ questionId: "q1", cleared: true });
  });

  test("a clear for a never-wrong question is inert", () => {
    const out = deriveMistakes([reading(0, { q1: 1, q2: 2 })], keys(), [clear(1, "q1")]);
    expect(out).toHaveLength(0);
  });

  test("vocab answers use 0/1 flags without an answer key", () => {
    const out = deriveMistakes(
      [{ kind: "vocab_quiz", refId: "quiz-toeic", completedAt: t(0), answers: { w1: 0, w2: 1 } }],
      new Map(),
      [],
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "vocab_quiz", questionId: "w1", cleared: false });
  });

  test("exam questions missing from the answer map count as wrong", () => {
    const out = deriveMistakes(
      [{ kind: "exam", refId: "e1", completedAt: t(0), answers: { x1: 0 } }],
      keys(),
      [],
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "exam", questionId: "x2", wrongCount: 1 });
  });

  test("stale question ids and unknown refIds are dropped", () => {
    const out = deriveMistakes(
      [
        reading(0, { q1: 0, q2: 2, ghost: 0 }),
        { kind: "reading", refId: "deleted", completedAt: t(1), answers: { q1: 0 } },
      ],
      keys(),
      [],
    );
    expect(out).toHaveLength(1);
    expect(out[0].questionId).toBe("q1");
  });

  test("resolution is input-order independent", () => {
    const wrong = reading(0, { q1: 0, q2: 2 });
    const right = reading(5, { q1: 1, q2: 2 });
    const forward = deriveMistakes([wrong, right], keys(), []);
    const backward = deriveMistakes([right, wrong], keys(), []);
    expect(forward).toEqual(backward);
    expect(forward[0].cleared).toBe(true);
  });

  test("sorted by most recent wrong first", () => {
    const out = deriveMistakes(
      [reading(0, { q1: 1, q2: 0 }), reading(5, { q1: 0, q2: 0 })],
      keys(),
      [],
    );
    expect(out.map((m) => m.questionId)).toEqual(["q1", "q2"]);
    expect(out[1].wrongCount).toBe(2);
  });
});
