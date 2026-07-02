import { describe, expect, test } from "bun:test";
import { computeStreak, localDay } from "./streak-core";

// Noon avoids any DST-edge weirdness when walking days backwards.
const day = (iso: string) => new Date(`${iso}T12:00:00`);

describe("localDay", () => {
  test("zero-pads month and day", () => {
    expect(localDay(day("2026-03-05"))).toBe("2026-03-05");
    expect(localDay(day("2026-11-30"))).toBe("2026-11-30");
  });
});

describe("computeStreak", () => {
  test("no activity is a zero streak", () => {
    expect(computeStreak(new Set(), day("2026-07-02"))).toBe(0);
  });

  test("activity today only", () => {
    expect(computeStreak(new Set(["2026-07-02"]), day("2026-07-02"))).toBe(1);
  });

  test("yesterday-only keeps the streak alive mid-day (grace)", () => {
    expect(computeStreak(new Set(["2026-07-01"]), day("2026-07-02"))).toBe(1);
  });

  test("activity two days ago is a broken streak", () => {
    expect(computeStreak(new Set(["2026-06-30"]), day("2026-07-02"))).toBe(0);
  });

  test("consecutive run counts fully", () => {
    const days = new Set(["2026-07-02", "2026-07-01", "2026-06-30"]);
    expect(computeStreak(days, day("2026-07-02"))).toBe(3);
  });

  test("a gap stops the count", () => {
    const days = new Set(["2026-07-02", "2026-07-01", "2026-06-29"]);
    expect(computeStreak(days, day("2026-07-02"))).toBe(2);
  });

  test("walks across a month boundary", () => {
    const days = new Set(["2026-03-02", "2026-03-01", "2026-02-28", "2026-02-27"]);
    expect(computeStreak(days, day("2026-03-02"))).toBe(4);
  });

  test("walks across a year boundary", () => {
    const days = new Set(["2026-01-01", "2025-12-31", "2025-12-30"]);
    expect(computeStreak(days, day("2026-01-01"))).toBe(3);
  });

  test("grace path still walks backwards from yesterday", () => {
    // Nothing today; streak = yesterday + the day before.
    const days = new Set(["2026-07-01", "2026-06-30"]);
    expect(computeStreak(days, day("2026-07-02"))).toBe(2);
  });
});
