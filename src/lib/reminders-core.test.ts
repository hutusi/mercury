import { describe, expect, test } from "bun:test";
import { reminderState } from "./reminders-core";
import { shiftCalendarDay } from "./streak-core";

const TODAY = "2026-07-12";

function daysAgo(n: number): string {
  return shiftCalendarDay(TODAY, -n);
}

describe("reminderState", () => {
  test("silent when the user already studied today", () => {
    const state = reminderState({ days: new Set([daysAgo(0)]), dueCount: 12, today: TODAY });
    expect(state.show).toBe(false);
    expect(state.streakAtRisk).toBe(false);
  });

  test("streak at risk: active yesterday, nothing today", () => {
    const state = reminderState({ days: new Set([daysAgo(1)]), dueCount: 0, today: TODAY });
    expect(state.streakAtRisk).toBe(true);
    expect(state.show).toBe(true);
  });

  test("due cards alone are enough to nudge", () => {
    const state = reminderState({ days: new Set(), dueCount: 3, today: TODAY });
    expect(state.streakAtRisk).toBe(false);
    expect(state.show).toBe(true);
  });

  test("no activity and nothing due stays silent", () => {
    const state = reminderState({ days: new Set(), dueCount: 0, today: TODAY });
    expect(state.show).toBe(false);
  });

  test("a lapsed streak (last activity two days ago) is not at risk", () => {
    const state = reminderState({ days: new Set([daysAgo(2)]), dueCount: 0, today: TODAY });
    expect(state.streakAtRisk).toBe(false);
    expect(state.show).toBe(false);
  });
});
