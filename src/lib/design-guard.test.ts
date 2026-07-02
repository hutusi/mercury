import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Erosion guard for the Lexicon design system (docs/DESIGN.md).
 *
 * The system's restraint is its identity: color flows through semantic tokens
 * (with cinnabar reserved for signature moments), there is no elevation, no
 * gradients, near-zero radius, and the only animation is a guarded pulse.
 * These rules were enforced by hand once; this test keeps them enforced.
 */

const SRC_DIR = join(import.meta.dir, "..");

/** Intentional exceptions: match by repo-relative path + offending line content. */
const ALLOWLIST: { file: string; pattern: RegExp }[] = [];

const PALETTE =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|white|black";

const RULES: { name: string; pattern: RegExp; hint: string }[] = [
  {
    name: "raw Tailwind palette color",
    pattern: new RegExp(
      `\\b(?:bg|text|border|ring|divide|from|via|to|decoration|accent|fill|stroke|outline|caret|placeholder)-(?:${PALETTE})(?:-\\d{2,3})?(?=[\\s"'\`/:]|$)`,
    ),
    hint: "use semantic tokens (background/foreground/primary/muted/cinnabar/destructive/…)",
  },
  {
    name: "box shadow",
    pattern: /\b(?:drop-)?shadow-(?:2xs|xs|sm|md|lg|xl|2xl|inner)\b/,
    hint: "the Lexicon is flat — use hairline borders (border-border) instead of elevation",
  },
  {
    name: "gradient",
    pattern: /\bbg-(?:linear|gradient|radial|conic)-/,
    hint: "no decorative gradients — paper needs no wash",
  },
  {
    name: "backdrop blur",
    pattern: /\bbackdrop-blur/,
    hint: "chrome is solid paper with a hairline border",
  },
  {
    name: "oversized radius",
    pattern: /\brounded-(?:xl|2xl|3xl|4xl)\b/,
    hint: "radius stays near-square (rounded-sm/lg = 2px scale); rounded-full only for dots",
  },
  {
    name: "unapproved animation",
    pattern: /\banimate-(?!pulse\b|none\b)[\w-]+/,
    hint: "the only animation is a functional pulse (exam timer <60s, recording dot)",
  },
  {
    name: "unguarded pulse",
    pattern: /^(?=.*\banimate-pulse\b)(?!.*motion-reduce:animate-none).*$/,
    hint: "pair animate-pulse with motion-reduce:animate-none",
  },
];

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(full);
    return entry.name.endsWith(".tsx") ? [full] : [];
  });
}

const files = tsxFiles(SRC_DIR).map((file) => ({
  path: relative(SRC_DIR, file),
  lines: readFileSync(file, "utf8").split("\n"),
}));

describe("Lexicon design guard (src/**/*.tsx)", () => {
  test("scans a plausible number of components", () => {
    expect(files.length).toBeGreaterThan(40);
  });

  for (const rule of RULES) {
    test(`no ${rule.name} — ${rule.hint}`, () => {
      const violations = files.flatMap(({ path, lines }) =>
        lines
          .map((line, i) => ({ line, no: i + 1 }))
          .filter(({ line }) => rule.pattern.test(line))
          .filter(({ line }) => !ALLOWLIST.some((a) => a.file === path && a.pattern.test(line)))
          .map(({ line, no }) => `src/${path}:${no}  ${line.trim()}`),
      );
      expect(violations).toEqual([]);
    });
  }
});
