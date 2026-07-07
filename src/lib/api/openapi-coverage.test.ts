import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

/**
 * Drift guard for docs/api/openapi.yaml: every /api/v1 route handler in the
 * codebase must be documented, and every documented /api/v1 operation must
 * exist in code. The better-auth /api/auth/* paths are documented for client
 * authors but implemented by the catch-all, so they are exempt here.
 */

const ROOT = join(import.meta.dir, "../../..");
const V1_DIR = join(ROOT, "src/app/api/v1");
const SPEC_PATH = join(ROOT, "docs/api/openapi.yaml");

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

function collectRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectRouteFiles(full));
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

function operationsInCode(): Set<string> {
  const ops = new Set<string>();
  for (const file of collectRouteFiles(V1_DIR)) {
    const urlPath =
      "/api/v1" +
      file
        .slice(V1_DIR.length)
        .replace(/\/route\.ts$/, "")
        .replace(/\[([^\]]+)\]/g, "{$1}");
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/export const (GET|POST|PUT|PATCH|DELETE)\b/g)) {
      ops.add(`${match[1].toLowerCase()} ${urlPath}`);
    }
  }
  return ops;
}

function operationsInSpec(): Set<string> {
  const spec = parse(readFileSync(SPEC_PATH, "utf8")) as {
    paths: Record<string, Record<string, unknown>>;
  };
  const ops = new Set<string>();
  for (const [path, item] of Object.entries(spec.paths)) {
    if (!path.startsWith("/api/v1/")) continue;
    for (const method of HTTP_METHODS) {
      if (item[method]) ops.add(`${method} ${path}`);
    }
  }
  return ops;
}

describe("openapi.yaml coverage", () => {
  const code = operationsInCode();
  const spec = operationsInSpec();

  test("route handlers exist for the guard to check", () => {
    expect(code.size).toBeGreaterThan(20);
  });

  test("every /api/v1 route handler is documented", () => {
    const undocumented = [...code].filter((op) => !spec.has(op)).sort();
    expect(undocumented).toEqual([]);
  });

  test("every documented /api/v1 operation exists in code", () => {
    const phantom = [...spec].filter((op) => !code.has(op)).sort();
    expect(phantom).toEqual([]);
  });
});
