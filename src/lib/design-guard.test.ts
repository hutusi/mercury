import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";

/**
 * The Daybreak design guard (docs/DESIGN.md). AGENTS.md and DESIGN.md both
 * state the system is "enforced by src/lib/design-guard.test.ts" as part of
 * `bun run test`; this file makes that claim true.
 *
 * It scans component and page source as text for the primitives the Lexicon
 * forbids. If you hit a failure, the fix is almost always "use a semantic token
 * or an existing component", not "loosen the rule here". Runs under Bun and is
 * DB-free — it only reads files.
 */

const ROOTS = ["src/components", "src/app"];

function sourceFiles(): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  for (const root of ROOTS) {
    const abs = path.join(process.cwd(), root);
    if (!fs.existsSync(abs)) continue;
    for (const rel of fs.readdirSync(abs, { recursive: true }) as string[]) {
      if (!/\.(ts|tsx)$/.test(rel)) continue;
      if (/\.(test|spec)\.(ts|tsx)$/.test(rel) || rel.endsWith(".d.ts")) continue;
      const full = path.join(abs, rel);
      out.push({ file: path.relative(process.cwd(), full), text: fs.readFileSync(full, "utf8") });
    }
  }
  return out;
}

const FILES = sourceFiles();

/** Files whose text matches `re`, for a readable failure message. */
function offenders(re: RegExp): string[] {
  return FILES.filter((f) => re.test(f.text)).map((f) => f.file);
}

// Tailwind's raw palette scales (bg-amber-50, text-green-600, …). Semantic
// tokens (bg-brand, text-muted-foreground) are unaffected — they never carry
// a numeric palette step.
const RAW_PALETTE =
  /\b(?:bg|text|border|ring|from|via|to|fill|stroke|outline|decoration|divide|caret|accent|placeholder|ring-offset)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;

// Elevation is a closed set of tokens (globals.css: shadow-raised, -pop,
// -float, -tab, -lift); the stock scale and arbitrary shadows are banned.
const SHADOW = /\bshadow-(?:2xs|xs|sm|md|lg|xl|2xl|inner)\b|\bshadow-\[|\bdrop-shadow\b/;
// Arbitrary colour values in classes (bg-[#…], text-[oklch(…)], color-mix)
// and colour literals in inline styles bypass the light/dark token sets.
const ARBITRARY_COLOR = /-\[(?:#|rgb|hsl|oklch|oklab|color-mix|var\(--(?!radix))/;
const INLINE_COLOR =
  /\b(?:color|background|backgroundColor|borderColor|fill|stroke)\s*:\s*["'`](?:#|rgb|hsl|oklch)/;
// Radii come from the scale (sm…2xl, full); no one-off radii.
const ARBITRARY_RADIUS = /\brounded(?:-[trbl]{1,2}|-[se]{1,2})?-\[/;
// Motion is short feedback: nothing slower than 450ms.
const LONG_DURATION = /\bduration-(?:500|700|1000)\b|\bduration-\[/;
const GRADIENT = /\bbg-(?:gradient|linear|radial|conic)\b/;
const BACKDROP = /\bbackdrop-blur\b/;
const TRANSITION_ALL = /\btransition-all\b/;
const SMOOTH_SCROLL = /behavior:\s*["']smooth["']/;
// Lexicon is retired (ADR 0032): its cinnabar red, the sidebar tokens, the
// mono micro-label scale. Coral is the only warm accent, and only for
// mistakes and the streak.
const RETIRED_TOKENS =
  /-cinnabar\b|\bsidebar-(?:border|foreground|accent|primary|ring)?\b|\btext-2xs\b|\btracking-label\b|\bfont-mono\b/;

// Pictographs and media-control glyphs. Icons must be lucide components so they
// carry an accessible role and inherit ink. CJK text and arrows (←, →) are
// deliberately outside these ranges.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

const GLOBALS_CSS = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

/** Custom properties declared in the first `selector { … }` block. */
function declaredVars(selector: string): Set<string> {
  const start = GLOBALS_CSS.indexOf(`${selector} {`);
  if (start < 0) return new Set();
  const body = GLOBALS_CSS.slice(start, GLOBALS_CSS.indexOf("}", start));
  return new Set([...body.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
}

describe("Daybreak design guard", () => {
  it("scans a non-trivial number of source files", () => {
    // Guards against a broken glob silently passing every check.
    expect(FILES.length).toBeGreaterThan(40);
  });

  it("uses semantic tokens, never raw Tailwind palette classes", () => {
    expect(offenders(RAW_PALETTE)).toEqual([]);
  });

  it("uses only the elevation tokens for shadows", () => {
    expect(offenders(SHADOW)).toEqual([]);
  });

  it("defines every colour token for both light and dark", () => {
    const light = declaredVars(":root");
    const dark = declaredVars(".dark");
    expect(light.size).toBeGreaterThan(30);
    expect([...light].filter((v) => !dark.has(v))).toEqual([]);
    expect([...dark].filter((v) => !light.has(v))).toEqual([]);
  });

  it("uses no retired Lexicon tokens", () => {
    expect(offenders(RETIRED_TOKENS)).toEqual([]);
    expect(GLOBALS_CSS).not.toMatch(/--color-cinnabar|--color-sidebar|--text-2xs|--tracking-label/);
  });

  it("keeps the global stylesheet off Google Fonts", () => {
    expect(GLOBALS_CSS).not.toMatch(/fonts\.googleapis/);
  });

  it("uses colour tokens, never arbitrary or inline colour values", () => {
    expect(offenders(ARBITRARY_COLOR)).toEqual([]);
    expect(offenders(INLINE_COLOR)).toEqual([]);
  });

  it("uses the radius scale, never one-off radii", () => {
    expect(offenders(ARBITRARY_RADIUS)).toEqual([]);
  });

  it("keeps motion short", () => {
    expect(offenders(LONG_DURATION)).toEqual([]);
  });

  it("gates transform and opacity transitions behind motion-reduce", () => {
    const bad = FILES.filter((f) => {
      const classAttrs = f.text.match(/className=(?:"[^"]*"|\{[^}]*\})/g) ?? [];
      const strings = f.text.match(/"[^"\n]*transition-\[[^"\n]*"/g) ?? [];
      return [...classAttrs, ...strings].some(
        (attr) =>
          /\btransition-(?:\[[^\]]*(?:opacity|transform|translate|scale)[^\]]*\]|transform|opacity)\b/.test(
            attr,
          ) && !attr.includes("motion-reduce:transition-none"),
      );
    }).map((f) => f.file);
    expect(bad).toEqual([]);
  });

  it("has no gradients", () => {
    expect(offenders(GRADIENT)).toEqual([]);
  });

  it("has no backdrop-blur", () => {
    expect(offenders(BACKDROP)).toEqual([]);
  });

  it("uses transition-colors, never transition-all", () => {
    expect(offenders(TRANSITION_ALL)).toEqual([]);
  });

  it("does not smooth-scroll (motion austerity)", () => {
    expect(offenders(SMOOTH_SCROLL)).toEqual([]);
  });

  it("gates every animation behind motion-reduce:animate-none", () => {
    const bad = FILES.filter((f) => {
      // Check each className string in isolation, so an ungated animate-* can't
      // hide behind an unrelated, properly-gated one elsewhere in the file.
      const classAttrs = f.text.match(/className=(?:"[^"]*"|\{[^}]*\})/g) ?? [];
      return classAttrs.some(
        (attr) =>
          /\banimate-(?!none)[a-z]/.test(attr) && !attr.includes("motion-reduce:animate-none"),
      );
    }).map((f) => f.file);
    expect(bad).toEqual([]);
  });

  it("uses lucide icons, not emoji glyphs", () => {
    expect(offenders(EMOJI)).toEqual([]);
  });

  it("uses bundled fonts so builds do not depend on Google Fonts", () => {
    expect(offenders(/next\/font\/google/)).toEqual([]);
  });
});
