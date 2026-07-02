import { describe, expect, test } from "bun:test";
import { isLocale, localePath, splitLocalePath, swapLocalePath } from "./routing";

describe("i18n routing helpers", () => {
  test("isLocale accepts only known locales", () => {
    expect(isLocale("zh")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  test("localePath prefixes internal hrefs", () => {
    expect(localePath("zh", "/")).toBe("/zh");
    expect(localePath("en", "/dashboard")).toBe("/en/dashboard");
    expect(localePath("zh", "/exams/exam-toeic-mini/take")).toBe("/zh/exams/exam-toeic-mini/take");
  });

  test("splitLocalePath extracts a known prefix", () => {
    expect(splitLocalePath("/zh")).toEqual({ locale: "zh", rest: "/" });
    expect(splitLocalePath("/en/dashboard")).toEqual({ locale: "en", rest: "/dashboard" });
    expect(splitLocalePath("/zh/exams/x/take")).toEqual({ locale: "zh", rest: "/exams/x/take" });
  });

  test("splitLocalePath leaves unprefixed and unknown-prefix paths intact", () => {
    expect(splitLocalePath("/")).toEqual({ locale: null, rest: "/" });
    expect(splitLocalePath("/dashboard")).toEqual({ locale: null, rest: "/dashboard" });
    expect(splitLocalePath("/fr/dashboard")).toEqual({ locale: null, rest: "/fr/dashboard" });
  });

  test("swapLocalePath keeps the path, changes the locale", () => {
    expect(swapLocalePath("/zh/dashboard", "en")).toBe("/en/dashboard");
    expect(swapLocalePath("/en", "zh")).toBe("/zh");
    // Unprefixed input still lands on a valid prefixed path.
    expect(swapLocalePath("/dashboard", "en")).toBe("/en/dashboard");
  });
});
