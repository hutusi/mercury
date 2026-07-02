import { describe, expect, test } from "bun:test";
import { estimateIeltsBand, estimateToeic, estimateToeicSection } from "./scoring";

describe("estimateToeicSection", () => {
  test("0% maps to the 5-point floor", () => {
    expect(estimateToeicSection(0, 12)).toBe(5);
  });

  test("100% maps to 495", () => {
    expect(estimateToeicSection(12, 12)).toBe(495);
  });

  test("80% maps to ~400", () => {
    expect(estimateToeicSection(8, 10)).toBe(400);
  });

  test("interpolates between anchor points", () => {
    // 50% is halfway between 40%→200 and 60%→300.
    expect(estimateToeicSection(5, 10)).toBe(250);
  });

  test("total combines both sections", () => {
    const { total, listening, reading } = estimateToeic(
      { raw: 12, max: 12 },
      { raw: 13, max: 13 },
    );
    expect(listening).toBe(495);
    expect(reading).toBe(495);
    expect(total).toBe(990);
  });
});

describe("estimateIeltsBand", () => {
  test("perfect score is band 9", () => {
    expect(estimateIeltsBand(23, 23)).toBe(9);
  });

  test("zero is the 3.5 floor", () => {
    expect(estimateIeltsBand(0, 23)).toBe(3.5);
  });

  test("60% is band 6.5", () => {
    expect(estimateIeltsBand(6, 10)).toBe(6.5);
  });

  test("just under a threshold falls to the band below", () => {
    expect(estimateIeltsBand(59, 100)).toBe(6);
  });
});
