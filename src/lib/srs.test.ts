import { describe, expect, test } from "bun:test";
import { NEW_CARD_STATE, scheduleReview } from "./srs";

const NOW = new Date("2026-01-01T08:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

describe("scheduleReview (SM-2)", () => {
  test("new card graded Good is due in 1 day", () => {
    const next = scheduleReview(NEW_CARD_STATE, 4, NOW);
    expect(next.intervalDays).toBe(1);
    expect(next.repetitions).toBe(1);
    expect(next.dueAt.getTime()).toBe(NOW.getTime() + DAY_MS);
  });

  test("second Good review is due in 6 days", () => {
    const first = scheduleReview(NEW_CARD_STATE, 4, NOW);
    const second = scheduleReview(first, 4, NOW);
    expect(second.intervalDays).toBe(6);
    expect(second.repetitions).toBe(2);
  });

  test("third Good review multiplies by ease factor (~15 days at EF 2.5)", () => {
    const state = { easeFactor: 2.5, intervalDays: 6, repetitions: 2, lapses: 0 };
    const next = scheduleReview(state, 4, NOW);
    expect(next.intervalDays).toBe(Math.round(6 * next.easeFactor));
    expect(next.intervalDays).toBeGreaterThanOrEqual(14);
    expect(next.intervalDays).toBeLessThanOrEqual(15);
  });

  test("Again resets repetitions, counts a lapse, due in ~10 minutes", () => {
    const state = { easeFactor: 2.5, intervalDays: 15, repetitions: 3, lapses: 0 };
    const next = scheduleReview(state, 1, NOW);
    expect(next.repetitions).toBe(0);
    expect(next.intervalDays).toBe(0);
    expect(next.lapses).toBe(1);
    expect(next.dueAt.getTime() - NOW.getTime()).toBe(10 * 60 * 1000);
    expect(next.easeFactor).toBeLessThan(2.5);
  });

  test("ease factor never drops below 1.3", () => {
    let state = { easeFactor: 1.35, intervalDays: 0, repetitions: 0, lapses: 0 };
    for (let i = 0; i < 5; i++) {
      state = scheduleReview(state, 1, NOW);
    }
    expect(state.easeFactor).toBe(1.3);
  });

  test("Hard grows mature intervals slowly (1.2x)", () => {
    const state = { easeFactor: 2.5, intervalDays: 10, repetitions: 5, lapses: 0 };
    const next = scheduleReview(state, 3, NOW);
    expect(next.intervalDays).toBe(12);
  });

  test("Easy raises ease factor and adds a bonus day", () => {
    const state = { easeFactor: 2.5, intervalDays: 10, repetitions: 5, lapses: 0 };
    const next = scheduleReview(state, 5, NOW);
    expect(next.easeFactor).toBeCloseTo(2.6);
    expect(next.intervalDays).toBe(Math.round(10 * 2.6) + 1);
  });
});
