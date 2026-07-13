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
type HttpMethod = (typeof HTTP_METHODS)[number];

interface OpenApiSpec {
  security?: { bearerAuth?: never[] }[];
  paths: Record<string, Record<string, unknown>>;
  components?: Record<string, unknown>;
}

const document = parse(readFileSync(SPEC_PATH, "utf8")) as OpenApiSpec;

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

function jsonBodyOperationsInCode(): Set<string> {
  const ops = new Set<string>();
  for (const file of collectRouteFiles(V1_DIR)) {
    const urlPath =
      "/api/v1" +
      file
        .slice(V1_DIR.length)
        .replace(/\/route\.ts$/, "")
        .replace(/\[([^\]]+)\]/g, "{$1}");
    const source = readFileSync(file, "utf8");
    if (!source.includes("readJson(req)")) continue;
    for (const match of source.matchAll(/export const (POST|PUT|PATCH|DELETE)\b/g)) {
      ops.add(`${match[1].toLowerCase()} ${urlPath}`);
    }
  }
  return ops;
}

function operationsInSpec(): Set<string> {
  const ops = new Set<string>();
  for (const [path, item] of Object.entries(document.paths)) {
    if (!path.startsWith("/api/v1/")) continue;
    for (const method of HTTP_METHODS) {
      if (item[method]) ops.add(`${method} ${path}`);
    }
  }
  return ops;
}

function resolveRef(ref: string): unknown {
  if (!ref.startsWith("#/")) return undefined;
  return ref
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce<unknown>((value, part) => {
      if (!value || typeof value !== "object") return undefined;
      return (value as Record<string, unknown>)[part];
    }, document);
}

function collectRefs(value: unknown, refs: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, refs);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "$ref" && typeof child === "string") refs.push(child);
      else collectRefs(child, refs);
    }
  }
  return refs;
}

function operationEntries(): [string, HttpMethod, Record<string, unknown>][] {
  const entries: [string, HttpMethod, Record<string, unknown>][] = [];
  for (const [path, item] of Object.entries(document.paths)) {
    if (!path.startsWith("/api/v1/")) continue;
    for (const method of HTTP_METHODS) {
      const operation = item[method];
      if (operation && typeof operation === "object") {
        entries.push([path, method, operation as Record<string, unknown>]);
      }
    }
  }
  return entries;
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

  test("all local references resolve", () => {
    const broken = [...new Set(collectRefs(document))].filter(
      (ref) => resolveRef(ref) === undefined,
    );
    expect(broken).toEqual([]);
  });

  test("every v1 operation has auth, discoverability, and a success response", () => {
    const failures: string[] = [];
    expect(document.security).toEqual([{ bearerAuth: [] }]);
    for (const [path, method, operation] of operationEntries()) {
      const label = `${method} ${path}`;
      if (typeof operation.summary !== "string" || !operation.summary.trim()) {
        failures.push(`${label}: summary`);
      }
      if (!Array.isArray(operation.tags) || operation.tags.length === 0) {
        failures.push(`${label}: tags`);
      }
      const responses = operation.responses as Record<string, unknown> | undefined;
      if (!responses || !Object.keys(responses).some((status) => /^2\d\d$/.test(status))) {
        failures.push(`${label}: success response`);
      }
      if (!responses?.["401"]) failures.push(`${label}: 401 response`);
    }
    expect(failures).toEqual([]);
  });

  test("path-template parameters are declared and required", () => {
    const failures: string[] = [];
    for (const [path, method, operation] of operationEntries()) {
      const expected = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();
      const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
      const actual = parameters
        .map((parameter) => {
          const resolved =
            parameter && typeof parameter === "object" && "$ref" in parameter
              ? resolveRef(String((parameter as { $ref: unknown }).$ref))
              : parameter;
          return resolved as { name?: string; in?: string; required?: boolean } | undefined;
        })
        .filter((parameter) => parameter?.in === "path" && parameter.required === true)
        .map((parameter) => parameter!.name!)
        .sort();
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        failures.push(`${method} ${path}: expected ${expected.join(",")}, got ${actual.join(",")}`);
      }
    }
    expect(failures).toEqual([]);
  });

  test("routes that parse JSON declare a required JSON request schema", () => {
    const failures: string[] = [];
    for (const label of jsonBodyOperationsInCode()) {
      const [method, path] = label.split(" ") as [HttpMethod, string];
      const operation = document.paths[path]?.[method] as Record<string, unknown> | undefined;
      const body = operation?.requestBody as Record<string, unknown> | undefined;
      const content = body?.content as Record<string, unknown> | undefined;
      const json = content?.["application/json"] as Record<string, unknown> | undefined;
      if (body?.required !== true || !json?.schema) failures.push(label);
    }
    expect(failures).toEqual([]);
  });
});
