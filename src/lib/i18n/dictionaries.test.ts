import { describe, expect, test } from "bun:test";
import { dictionaries } from "./dictionaries";

function leafPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") {
      return leafPaths(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

describe("i18n dictionaries", () => {
  // The Dictionary type already enforces parity at compile time; this runtime
  // guard catches `as`-casts and protects future locale additions.
  test("zh and en expose exactly the same key paths", () => {
    const zhPaths = leafPaths(dictionaries.zh).sort();
    const enPaths = leafPaths(dictionaries.en).sort();
    expect(enPaths).toEqual(zhPaths);
  });

  for (const locale of ["zh", "en"] as const) {
    test(`${locale}: every leaf is a non-empty string`, () => {
      for (const path of leafPaths(dictionaries[locale])) {
        const value = path
          .split(".")
          .reduce<unknown>(
            (node, key) => (node as Record<string, unknown>)[key],
            dictionaries[locale],
          );
        expect(typeof value).toBe("string");
        expect((value as string).length).toBeGreaterThan(0);
      }
    });
  }
});
