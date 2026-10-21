import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { PROTECTED_PATHS } from "./routes";

/**
 * Guards PROTECTED_PATHS against drift: it feeds both the proxy's fast auth
 * redirect and robots.txt's crawler block, so a new authenticated route that
 * isn't registered would silently be crawlable and skip the fast redirect. This
 * reads the actual route tree (DB-free, like src/lib/design-guard.test.ts) so
 * adding an (app) segment without updating the list fails here.
 */

// URL segments of the authenticated area. Route groups (`(shell)`, `(flow)`)
// don't add a URL segment, so recurse through them and collect the first real
// segment below; private folders (_) are skipped. The same URL segment can
// live in both groups (/reading hub in shell, /reading/[id] in flow).
const APP_GROUP = path.join(process.cwd(), "src/app/[locale]/(app)");

function appRouteSegments(dir: string = APP_GROUP): string[] {
  const segments = new Set<string>();
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    if (entry.name.startsWith("(")) {
      for (const seg of appRouteSegments(path.join(dir, entry.name))) segments.add(seg);
    } else {
      segments.add(`/${entry.name}`);
    }
  }
  return [...segments];
}

const registered = PROTECTED_PATHS as readonly string[];

describe("protected routes", () => {
  it("covers every authenticated (app) route segment", () => {
    const segments = appRouteSegments();
    // Guards the walk itself: a broken recursion must not pass vacuously.
    expect(segments.length).toBeGreaterThanOrEqual(13);
    const missing = segments.filter((seg) => !registered.includes(seg));
    expect(missing).toEqual([]);
  });

  it("covers /onboarding (protected, but outside the (app) group)", () => {
    expect(registered).toContain("/onboarding");
  });
});
