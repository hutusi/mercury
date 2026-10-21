import { describe, expect, it } from "bun:test";
import { fill } from "./fill";

describe("fill", () => {
  it("replaces named placeholders, in any order", () => {
    expect(fill("第 {i} 站，共 {n} 站", { i: 2, n: 4 })).toBe("第 2 站，共 4 站");
    expect(fill("Stop {i} of {n}", { n: 4, i: 2 })).toBe("Stop 2 of 4");
  });

  it("leaves unknown placeholders visible instead of dropping them", () => {
    expect(fill("{a} and {b}", { a: 1 })).toBe("1 and {b}");
  });
});
