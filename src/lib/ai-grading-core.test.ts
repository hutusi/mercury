import { describe, expect, test } from "bun:test";
import {
  aiGradingDailyLimit,
  DEFAULT_AI_GRADING_DAILY_LIMIT,
  gradingInputHash,
} from "./ai-grading-core";

describe("aiGradingDailyLimit", () => {
  test("defaults invalid or missing configuration to ten", () => {
    expect(aiGradingDailyLimit({})).toBe(DEFAULT_AI_GRADING_DAILY_LIMIT);
    expect(aiGradingDailyLimit({ MERCURY_AI_GRADING_DAILY_LIMIT: "0" })).toBe(
      DEFAULT_AI_GRADING_DAILY_LIMIT,
    );
    expect(aiGradingDailyLimit({ MERCURY_AI_GRADING_DAILY_LIMIT: "nope" })).toBe(
      DEFAULT_AI_GRADING_DAILY_LIMIT,
    );
  });

  test("accepts a positive configured cap", () => {
    expect(aiGradingDailyLimit({ MERCURY_AI_GRADING_DAILY_LIMIT: "17" })).toBe(17);
  });
});

describe("gradingInputHash", () => {
  test("is stable for an input and changes with learner content", () => {
    const input = { promptId: "prompt-1", text: "original" };
    expect(gradingInputHash(input)).toBe(gradingInputHash(input));
    expect(gradingInputHash(input)).not.toBe(
      gradingInputHash({ promptId: "prompt-1", text: "changed" }),
    );
  });
});
