import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";

/**
 * Client components must never import the dictionaries at runtime: that
 * bundles both locales into every page's JS. The active dictionary reaches
 * the client as a LocaleProvider prop; client code reads it with useT() and
 * imports locale primitives from i18n/locale.ts. Type-only imports are fine
 * (erased at build).
 */
function clientFiles(): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  const root = path.join(process.cwd(), "src");
  for (const rel of fs.readdirSync(root, { recursive: true }) as string[]) {
    if (!/\.(ts|tsx)$/.test(rel) || /\.test\.tsx?$/.test(rel)) continue;
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    if (/^\s*["']use client["']/.test(text)) out.push({ file: `src/${rel}`, text });
  }
  return out;
}

const RUNTIME_DICT_IMPORT =
  /^import\s+(?!type\b)[^;]*from\s+["'](?:@\/lib\/i18n|[./]+(?:lib\/)?i18n)(?:\/dictionaries)?["']/m;

describe("client i18n bundle", () => {
  const files = clientFiles();

  it("finds client components to check", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("keeps dictionaries out of client JS", () => {
    expect(files.filter((f) => RUNTIME_DICT_IMPORT.test(f.text)).map((f) => f.file)).toEqual([]);
  });
});
