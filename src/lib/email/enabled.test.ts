import { describe, expect, test } from "bun:test";
import { DEFAULT_EMAIL_FROM, emailFrom, isEmailEnabled } from "./enabled";

describe("isEmailEnabled", () => {
  test("off without a key, and blanks count as unset", () => {
    expect(isEmailEnabled({})).toBe(false);
    expect(isEmailEnabled({ RESEND_API_KEY: "" })).toBe(false);
    expect(isEmailEnabled({ RESEND_API_KEY: " " })).toBe(false);
  });

  test("on with a non-blank key", () => {
    expect(isEmailEnabled({ RESEND_API_KEY: "re_123" })).toBe(true);
  });
});

describe("emailFrom", () => {
  test("defaults to the prod sender", () => {
    expect(emailFrom({})).toBe(DEFAULT_EMAIL_FROM);
    expect(emailFrom({ MERCURY_EMAIL_FROM: " " })).toBe(DEFAULT_EMAIL_FROM);
  });

  test("override wins when set", () => {
    expect(emailFrom({ MERCURY_EMAIL_FROM: "onboarding@resend.dev" })).toBe(
      "onboarding@resend.dev",
    );
  });
});
