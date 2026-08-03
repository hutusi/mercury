import { describe, expect, test } from "bun:test";
import { formatLearnerDate } from "./format-date";

describe("formatLearnerDate", () => {
  // 16:30 UTC = next day 00:30 in Asia/Shanghai — the boundary that made
  // server (UTC) and browser (UTC+8) renders disagree.
  const instant = new Date("2026-08-01T16:30:00.000Z");

  test("formats in the learner's timezone, not the process TZ", () => {
    expect(formatLearnerDate(instant, "zh", "Asia/Shanghai")).toBe("2026/8/2");
    expect(formatLearnerDate(instant, "zh", "UTC")).toBe("2026/8/1");
  });

  test("locale drives the display language", () => {
    expect(formatLearnerDate(instant, "en", "Asia/Shanghai")).toBe("8/2/2026");
  });

  test("options pass through (short month + day, with time)", () => {
    expect(
      formatLearnerDate(instant, "en", "Asia/Shanghai", {
        month: "short",
        day: "numeric",
      }),
    ).toBe("Aug 2");
    expect(
      formatLearnerDate(instant, "en", "Asia/Shanghai", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    ).toContain("12:30");
  });
});
