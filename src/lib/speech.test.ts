import { describe, expect, it } from "bun:test";
import { pickEnglishVoices } from "./speech";

function voice(
  name: string,
  lang: string,
  opts: { localService?: boolean; default?: boolean } = {},
): SpeechSynthesisVoice {
  return {
    name,
    lang,
    localService: opts.localService ?? false,
    default: opts.default ?? false,
    voiceURI: name,
  } as SpeechSynthesisVoice;
}

describe("pickEnglishVoices", () => {
  it("prefers Edge neural voices over legacy local defaults", () => {
    const ranked = pickEnglishVoices([
      voice("Microsoft David - English (United States)", "en-US", {
        localService: true,
        default: true,
      }),
      voice("Microsoft Aria Online (Natural) - English (United States)", "en-US"),
    ]);
    expect(ranked[0].name).toContain("Natural");
  });

  it("prefers Chrome's remote Google voice over the robotic local default", () => {
    const ranked = pickEnglishVoices([
      voice("Fred", "en-US", { localService: true, default: true }),
      voice("Google US English", "en-US"),
    ]);
    expect(ranked[0].name).toBe("Google US English");
  });

  it("prefers Apple Premium/Enhanced voices over plain system voices", () => {
    const ranked = pickEnglishVoices([
      voice("Samantha", "en-US", { localService: true, default: true }),
      voice("Ava (Premium)", "en-US", { localService: true }),
    ]);
    expect(ranked[0].name).toBe("Ava (Premium)");
  });

  it("prefers en-US within the same quality tier", () => {
    const ranked = pickEnglishVoices([
      voice("Microsoft Sonia Online (Natural) - English (United Kingdom)", "en-GB"),
      voice("Microsoft Aria Online (Natural) - English (United States)", "en-US"),
    ]);
    expect(ranked[0].lang).toBe("en-US");
  });

  it("ranks quality above locale: a natural en-GB voice beats a legacy en-US voice", () => {
    const ranked = pickEnglishVoices([
      voice("Fred", "en-US", { localService: true, default: true }),
      voice("Microsoft Sonia Online (Natural) - English (United Kingdom)", "en-GB"),
    ]);
    expect(ranked[0].name).toContain("Sonia");
  });

  it("keeps the default as a tiebreak among otherwise-equal legacy voices", () => {
    const ranked = pickEnglishVoices([
      voice("Zed", "en-US", { localService: true }),
      voice("Samantha", "en-US", { localService: true, default: true }),
    ]);
    expect(ranked[0].name).toBe("Samantha");
  });

  it("sorts deterministically by name when tiers and locale tie", () => {
    const ranked = pickEnglishVoices([
      voice("Victoria", "en-US", { localService: true }),
      voice("Alex", "en-US", { localService: true }),
    ]);
    expect(ranked.map((v) => v.name)).toEqual(["Alex", "Victoria"]);
  });

  it("filters to English and returns [] when none exist", () => {
    expect(pickEnglishVoices([voice("Ting-Ting", "zh-CN")])).toEqual([]);
    expect(pickEnglishVoices([])).toEqual([]);
    const mixed = pickEnglishVoices([voice("Ting-Ting", "zh-CN"), voice("Karen", "en-AU")]);
    expect(mixed.map((v) => v.name)).toEqual(["Karen"]);
  });
});
