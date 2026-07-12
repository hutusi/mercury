import { describe, expect, test } from "bun:test";
import { modelForProvider, resolveAiProvider } from "./provider";

// Pass env objects explicitly — never mutate process.env, so tests stay
// order-independent and hermetic.

describe("resolveAiProvider", () => {
  test("auto-detects anthropic when only its key is set", () => {
    expect(resolveAiProvider({ ANTHROPIC_API_KEY: "sk-ant" })).toBe("anthropic");
  });

  test("auto-detects bailian when only its key is set", () => {
    expect(resolveAiProvider({ DASHSCOPE_API_KEY: "sk-ds" })).toBe("bailian");
  });

  test("prefers anthropic when both keys are set", () => {
    expect(resolveAiProvider({ ANTHROPIC_API_KEY: "a", DASHSCOPE_API_KEY: "b" })).toBe("anthropic");
  });

  test("explicit provider wins over auto-detect order", () => {
    expect(
      resolveAiProvider({
        MERCURY_AI_PROVIDER: "bailian",
        ANTHROPIC_API_KEY: "a",
        DASHSCOPE_API_KEY: "b",
      }),
    ).toBe("bailian");
  });

  test("explicit provider without its key disables AI (degradation, not crash)", () => {
    expect(
      resolveAiProvider({ MERCURY_AI_PROVIDER: "bailian", ANTHROPIC_API_KEY: "a" }),
    ).toBeNull();
  });

  test("unknown explicit provider disables AI", () => {
    expect(resolveAiProvider({ MERCURY_AI_PROVIDER: "openai", ANTHROPIC_API_KEY: "a" })).toBeNull();
  });

  test("no keys at all disables AI", () => {
    expect(resolveAiProvider({})).toBeNull();
  });

  test("empty-string keys count as unset (e2e forces degradation this way)", () => {
    expect(resolveAiProvider({ ANTHROPIC_API_KEY: "", DASHSCOPE_API_KEY: "" })).toBeNull();
  });
});

describe("modelForProvider", () => {
  test("per-provider defaults", () => {
    expect(modelForProvider("anthropic", {})).toBe("claude-sonnet-5");
    expect(modelForProvider("bailian", {})).toBe("glm-5.2");
  });

  test("MERCURY_AI_MODEL overrides either default", () => {
    expect(modelForProvider("anthropic", { MERCURY_AI_MODEL: "claude-opus-4-8" })).toBe(
      "claude-opus-4-8",
    );
    expect(modelForProvider("bailian", { MERCURY_AI_MODEL: "qwen-max" })).toBe("qwen-max");
  });
});
