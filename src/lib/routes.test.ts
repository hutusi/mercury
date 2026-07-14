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

// Route segments live directly under the (app) group. Skip private folders (_)
// and nested route groups (()).
const APP_GROUP = path.join(process.cwd(), "src/app/[locale]/(app)");

function appRouteSegments(): string[] {
  return fs
    .readdirSync(APP_GROUP, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("("))
    .map((d) => `/${d.name}`);
}

const registered = PROTECTED_PATHS as readonly string[];

describe("protected routes", () => {
  it("covers every authenticated (app) route segment", () => {
    const missing = appRouteSegments().filter((seg) => !registered.includes(seg));
    expect(missing).toEqual([]);
  });

  it("covers /onboarding (protected, but outside the (app) group)", () => {
    expect(registered).toContain("/onboarding");
  });
});
