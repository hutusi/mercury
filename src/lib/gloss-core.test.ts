import { describe, expect, test } from "bun:test";
import {
  buildGlossPattern,
  headwordVariants,
  segmentGlossText,
  type GlossEntry,
} from "./gloss-core";

const entry = (wordId: string, headword: string): GlossEntry => ({
  wordId,
  headword,
  translationZh: "释义",
  ipa: "/x/",
  pos: "n.",
});

const matched = (text: string, entries: GlossEntry[]) =>
  segmentGlossText(text, buildGlossPattern(entries))
    .filter((s) => typeof s !== "string")
    .map((s) => (typeof s === "string" ? s : `${s.text}=${s.wordId}`));

describe("gloss matching", () => {
  test("matches inflections of single words", () => {
    const entries = [entry("w1", "adjourn"), entry("w2", "consensus"), entry("w3", "plan")];
    expect(
      matched("The meeting was adjourned. No consensus. Planning and plans matter.", entries),
    ).toEqual(["adjourned=w1", "consensus=w2", "Planning=w3", "plans=w3"]);
  });

  test("y → ies/ied and e-drop forms", () => {
    expect(
      matched("She replied; he complies; they're circulating it.", [
        entry("a", "reply"),
        entry("b", "comply"),
        entry("c", "circulate"),
      ]),
    ).toEqual(["replied=a", "complies=b", "circulating=c"]);
  });

  test("respects word boundaries, including accented letters", () => {
    expect(matched("A planet, not a plan.", [entry("w", "plan")])).toEqual(["plan=w"]);
    expect(matched("Send your résumé today.", [entry("r", "résumé")])).toEqual(["résumé=r"]);
  });

  test("multi-word headwords allow any whitespace and inflect the first word", () => {
    expect(
      matched("We will circle\nback, then circled back again.", [entry("c", "circle back")]),
    ).toEqual(["circle\nback=c", "circled back=c"]);
    // Longest match wins over a shorter headword inside it.
    expect(
      matched("List the action items now.", [entry("a", "action"), entry("ai", "action item")]),
    ).toEqual(["action items=ai"]);
  });

  test("segments always join back to the original text", () => {
    const text = "Minutes taken by S. Patel. The minutes were circulated.";
    const segments = segmentGlossText(text, buildGlossPattern([entry("m", "minutes")]));
    expect(segments.map((s) => (typeof s === "string" ? s : s.text)).join("")).toBe(text);
  });

  test("no entries means one untouched segment", () => {
    expect(segmentGlossText("anything", buildGlossPattern([]))).toEqual(["anything"]);
  });

  test("escapes regex metacharacters in headwords", () => {
    expect(headwordVariants("C++")[0]).toBe("c\\+\\+");
  });
});

describe("gloss matching over the real vocabulary", () => {
  test("every seeded headword compiles and finds itself in a sentence", async () => {
    const { allVocab } = await import("../content/load");
    const entries = allVocab.map((w) => entry(w.id, w.headword));
    const pattern = buildGlossPattern(entries);
    expect(pattern).not.toBeNull();
    const missing = allVocab.filter((w) => {
      const segments = segmentGlossText(`We discussed ${w.headword} today.`, pattern);
      return !segments.some((s) => typeof s !== "string" && s.text === w.headword);
    });
    expect(missing.map((w) => w.headword)).toEqual([]);
  });
});
