import { describe, expect, test } from "bun:test";
import { entitlementsForTier, resolveTier, type MembershipLike } from "./membership-core";

const now = new Date("2026-08-01T10:00:00Z");
const premium = (expiresAt: Date | null): MembershipLike => ({ tier: "premium", expiresAt });

describe("resolveTier", () => {
  test("no row means free", () => {
    expect(resolveTier(null, now)).toBe("free");
    expect(resolveTier(undefined, now)).toBe("free");
  });

  test("premium without expiry stays premium", () => {
    expect(resolveTier(premium(null), now)).toBe("premium");
  });

  test("future expiry is premium, past or exact expiry is free", () => {
    expect(resolveTier(premium(new Date("2026-09-01T00:00:00Z")), now)).toBe("premium");
    expect(resolveTier(premium(new Date("2026-07-01T00:00:00Z")), now)).toBe("free");
    expect(resolveTier(premium(now), now)).toBe("free");
  });
});

describe("entitlementsForTier", () => {
  test("free reuses the existing per-day limits (defaults 30 / 10)", () => {
    expect(entitlementsForTier("free", {})).toEqual({
      chatDailyLimit: 30,
      aiGradingDailyLimit: 10,
    });
  });

  test("free honors the existing env overrides", () => {
    const env = { MERCURY_CHAT_DAILY_LIMIT: "5", MERCURY_AI_GRADING_DAILY_LIMIT: "3" };
    expect(entitlementsForTier("free", env)).toEqual({
      chatDailyLimit: 5,
      aiGradingDailyLimit: 3,
    });
  });

  test("premium defaults to 100 / 30", () => {
    expect(entitlementsForTier("premium", {})).toEqual({
      chatDailyLimit: 100,
      aiGradingDailyLimit: 30,
    });
  });

  test("premium honors its env overrides and rejects invalid values", () => {
    const env = {
      MERCURY_CHAT_DAILY_LIMIT_PREMIUM: "200",
      MERCURY_AI_GRADING_DAILY_LIMIT_PREMIUM: "abc",
    };
    expect(entitlementsForTier("premium", env)).toEqual({
      chatDailyLimit: 200,
      aiGradingDailyLimit: 30,
    });
    expect(entitlementsForTier("premium", { MERCURY_CHAT_DAILY_LIMIT_PREMIUM: "0" })).toEqual({
      chatDailyLimit: 100,
      aiGradingDailyLimit: 30,
    });
  });

  test("premium is clamped to never sit below free", () => {
    const env = { MERCURY_CHAT_DAILY_LIMIT: "500", MERCURY_AI_GRADING_DAILY_LIMIT: "40" };
    expect(entitlementsForTier("premium", env)).toEqual({
      chatDailyLimit: 500,
      aiGradingDailyLimit: 40,
    });
  });
});
