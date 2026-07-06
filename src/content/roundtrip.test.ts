import { describe, expect, test } from "bun:test";
import * as oldTs from "./index";
import * as fromYaml from "./load";

/**
 * TEMPORARY migration gate: proves the generated content/**.yaml is a
 * lossless serialization of the hand-authored TS before the TS is deleted.
 * Deep equality covers string fidelity (every newline and paragraph break),
 * numeric types, optional-key presence, item order, and aggregate order.
 * Deleted together with src/content/index.ts and the TS data files.
 */
describe("TEMPORARY: YAML round-trips the TS content losslessly", () => {
  const keys = [
    "allVocab",
    "allReading",
    "allListening",
    "allWriting",
    "allSpeaking",
    "allExams",
  ] as const;
  for (const key of keys) {
    test(key, () => {
      expect(fromYaml[key]).toEqual(oldTs[key] as never);
    });
  }
});
