import { describe, expect, it } from "bun:test";
import { DAY_MS, decodeDraft, draftKey, draftKeysIn, encodeDraft, isAnswerMap } from "./drafts";

const isString = (v: unknown): v is string => typeof v === "string";

describe("drafts", () => {
  it("round-trips a value within its lifetime", () => {
    const raw = encodeDraft("an essay", 1_000);
    expect(decodeDraft(raw, isString, { maxAgeMs: DAY_MS, now: 2_000 })).toBe("an essay");
  });

  it("treats expired, malformed, invalid, and future-dated drafts as absent", () => {
    expect(decodeDraft(encodeDraft("x", 0), isString, { maxAgeMs: 10, now: 11 })).toBeNull();
    expect(decodeDraft("{not json", isString, { maxAgeMs: DAY_MS })).toBeNull();
    expect(decodeDraft(encodeDraft(42, 0), isString, { maxAgeMs: DAY_MS, now: 1 })).toBeNull();
    expect(decodeDraft(JSON.stringify("bare"), isString, { maxAgeMs: DAY_MS })).toBeNull();
    expect(
      decodeDraft(encodeDraft("x", 10 * DAY_MS), isString, { maxAgeMs: DAY_MS, now: 0 }),
    ).toBeNull();
    expect(decodeDraft(null, isString, { maxAgeMs: DAY_MS })).toBeNull();
  });

  it("namespaces keys and lists only draft keys", () => {
    expect(draftKey("writing", "w-1")).toBe("mercury.draft.v1.writing.w-1");
    const entries = [
      "mercury.draft.v1.writing.a",
      "mercury.vocab.autoSpeak",
      "mercury.draft.v0.x",
      "mercury-exam-attempt-1",
    ];
    const store = { length: entries.length, key: (i: number) => entries[i] ?? null };
    expect(draftKeysIn(store)).toEqual([
      "mercury.draft.v1.writing.a",
      "mercury.draft.v0.x",
      "mercury-exam-attempt-1",
    ]);
  });

  it("validates answer maps", () => {
    expect(isAnswerMap({ q1: 0, q2: 3 })).toBe(true);
    expect(isAnswerMap({ q1: 4 })).toBe(false);
    expect(isAnswerMap({ q1: "0" })).toBe(false);
    expect(isAnswerMap([0])).toBe(false);
    expect(isAnswerMap(null)).toBe(false);
  });
});
