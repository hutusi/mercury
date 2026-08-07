import { describe, expect, test } from "bun:test";
import {
  entitlementsForTier,
  isGrantableExpiryDate,
  isValidCalendarDate,
  resolveTier,
  type MembershipLike,
} from "./membership-core";

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

describe("isValidCalendarDate", () => {
  test("accepts real calendar dates", () => {
    expect(isValidCalendarDate("2026-09-30")).toBe(true);
    expect(isValidCalendarDate("2028-02-29")).toBe(true); // leap year
  });

  test("rejects impossible dates instead of letting Date roll them over", () => {
    expect(isValidCalendarDate("2026-02-31")).toBe(false); // would become March 3
    expect(isValidCalendarDate("2026-02-29")).toBe(false); // 2026 is not a leap year
    expect(isValidCalendarDate("9999-99-99")).toBe(false); // Invalid Date
  });

  test("rejects malformed shapes", () => {
    expect(isValidCalendarDate("2026-9-30")).toBe(false);
    expect(isValidCalendarDate("not-a-date")).toBe(false);
    expect(isValidCalendarDate("")).toBe(false);
  });

  test("rejects year zero — valid in ISO/JS, but Postgres has no year 0", () => {
    expect(isValidCalendarDate("0000-01-01")).toBe(false);
  });
});

describe("isGrantableExpiryDate", () => {
  test("today and future dates are grantable, past dates are not", () => {
    expect(isGrantableExpiryDate("2026-07-31", now)).toBe(false); // yesterday
    expect(isGrantableExpiryDate("2026-08-01", now)).toBe(true); // today: expires tonight UTC
    expect(isGrantableExpiryDate("2026-09-30", now)).toBe(true);
  });

  test("invalid dates are never grantable", () => {
    expect(isGrantableExpiryDate("2026-02-31", now)).toBe(false);
    expect(isGrantableExpiryDate("0000-01-01", now)).toBe(false);
  });
});

describe("entitlementsForTier", () => {
  test("free reuses the existing per-day limits (defaults 30 / 10)", () => {
    expect(entitlementsForTier("free", {})).toEqual({
      chatDailyLimit: 30,
      aiGradingDailyLimit: 10,
      bookChatEnabled: false,
      bookChatDailyLimit: 50,
    });
  });

  test("free honors the existing env overrides", () => {
    const env = { MERCURY_CHAT_DAILY_LIMIT: "5", MERCURY_AI_GRADING_DAILY_LIMIT: "3" };
    expect(entitlementsForTier("free", env)).toEqual({
      chatDailyLimit: 5,
      aiGradingDailyLimit: 3,
      bookChatEnabled: false,
      bookChatDailyLimit: 50,
    });
  });

  test("premium defaults to 100 / 30", () => {
    expect(entitlementsForTier("premium", {})).toEqual({
      chatDailyLimit: 100,
      aiGradingDailyLimit: 30,
      bookChatEnabled: true,
      bookChatDailyLimit: 50,
    });
  });

  test("premium honors its env overrides and rejects invalid values", () => {
    const env = {
      MERCURY_CHAT_DAILY_LIMIT_PREMIUM: "200",
      MERCURY_AI_GRADING_DAILY_LIMIT_PREMIUM: "abc",
    };
    expect(entitlementsForTier("premium", env)).toMatchObject({
      chatDailyLimit: 200,
      aiGradingDailyLimit: 30,
    });
    expect(entitlementsForTier("premium", { MERCURY_CHAT_DAILY_LIMIT_PREMIUM: "0" })).toMatchObject({
      chatDailyLimit: 100,
      aiGradingDailyLimit: 30,
    });
  });

  test("premium is clamped to never sit below free", () => {
    const env = { MERCURY_CHAT_DAILY_LIMIT: "500", MERCURY_AI_GRADING_DAILY_LIMIT: "40" };
    expect(entitlementsForTier("premium", env)).toMatchObject({
      chatDailyLimit: 500,
      aiGradingDailyLimit: 40,
    });
  });

  test("book chat is gated by tier, not by limit — the boolean flips, the cap is shared", () => {
    const env = { MERCURY_BOOK_CHAT_DAILY_LIMIT: "20" };
    expect(entitlementsForTier("free", env)).toMatchObject({
      bookChatEnabled: false,
      bookChatDailyLimit: 20,
    });
    expect(entitlementsForTier("premium", env)).toMatchObject({
      bookChatEnabled: true,
      bookChatDailyLimit: 20,
    });
  });

  test("book chat limit rejects invalid values back to the default", () => {
    expect(entitlementsForTier("premium", { MERCURY_BOOK_CHAT_DAILY_LIMIT: "0" })).toMatchObject({
      bookChatDailyLimit: 50,
    });
    expect(entitlementsForTier("premium", { MERCURY_BOOK_CHAT_DAILY_LIMIT: "abc" })).toMatchObject({
      bookChatDailyLimit: 50,
    });
  });
});
