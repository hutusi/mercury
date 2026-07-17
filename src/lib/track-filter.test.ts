import { describe, expect, test } from "bun:test";
import { parseExamTrackFilter, parseTrackFilter } from "./track-filter";

describe("parseTrackFilter", () => {
  test("absent param defaults to the goal track", () => {
    expect(parseTrackFilter(undefined, "toeic")).toEqual({ filter: "toeic", track: "toeic" });
  });

  test("a concrete param wins over the goal", () => {
    expect(parseTrackFilter("business", "toeic")).toEqual({
      filter: "business",
      track: "business",
    });
  });

  test("'all' lifts the filter", () => {
    expect(parseTrackFilter("all", "ielts")).toEqual({ filter: "all", track: null });
  });

  test("invalid input degrades to the goal default", () => {
    expect(parseTrackFilter("gre", "ielts")).toEqual({ filter: "ielts", track: "ielts" });
  });
});

describe("parseExamTrackFilter", () => {
  test("an exam goal defaults to its own exam", () => {
    expect(parseExamTrackFilter(undefined, "toeic")).toEqual({ filter: "toeic", track: "toeic" });
  });

  test("a business goal defaults to all exams", () => {
    expect(parseExamTrackFilter(undefined, "business")).toEqual({ filter: "all", track: null });
  });

  test("'business' is not a valid exam filter and falls back", () => {
    expect(parseExamTrackFilter("business", "ielts")).toEqual({ filter: "ielts", track: "ielts" });
  });

  test("explicit exam track and 'all' pass through", () => {
    expect(parseExamTrackFilter("ielts", "toeic").track).toBe("ielts");
    expect(parseExamTrackFilter("all", "toeic").track).toBeNull();
  });
});
