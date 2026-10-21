import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { GRADING_CLAIM_STALE_MS } from "../ai-grading-core";
import { CHAT_CLAIM_STALE_MS } from "../chat-core";
import {
  AI_ATTEMPT_TIMEOUT_MS,
  AI_CALL_BUDGET_MS,
  AI_MAX_RETRIES,
  AI_ROUTE_MAX_DURATION_S,
} from "./budget";

// Every route (API handler or page whose server actions call AI) that makes a
// runtime provider call. A new AI surface must join this list.
const AI_ROUTES = [
  "src/app/api/v1/tutor/messages/route.ts",
  "src/app/api/v1/speaking/[promptId]/submissions/route.ts",
  "src/app/api/v1/writing/[promptId]/submissions/route.ts",
  "src/app/api/v1/speaking/submissions/[submissionId]/retry-feedback/route.ts",
  "src/app/api/v1/writing/submissions/[submissionId]/retry-feedback/route.ts",
  "src/app/api/v1/books/[bookId]/chat/messages/route.ts",
  "src/app/[locale]/(app)/writing/[promptId]/page.tsx",
  "src/app/[locale]/(app)/writing/submissions/[submissionId]/page.tsx",
  "src/app/[locale]/(app)/speaking/[promptId]/page.tsx",
  "src/app/[locale]/(app)/speaking/submissions/[submissionId]/page.tsx",
  "src/app/[locale]/(app)/tutor/page.tsx",
  "src/app/[locale]/(app)/books/[bookId]/chapters/[chapterId]/page.tsx",
];

describe("AI wall-clock budget", () => {
  it("ends every call inside the single-flight stale windows", () => {
    const route = AI_ROUTE_MAX_DURATION_S * 1000;
    // Headroom for the claim + publish transactions around the provider call.
    expect(AI_CALL_BUDGET_MS + 10_000).toBeLessThanOrEqual(route);
    // A function the platform kills still leaves the lease to go stale later,
    // never a reclaim while the original request is alive.
    expect(route).toBeLessThan(GRADING_CLAIM_STALE_MS);
    expect(route).toBeLessThan(CHAT_CLAIM_STALE_MS);
  });

  it("lets the first attempt use a full per-attempt timeout", () => {
    expect(AI_ATTEMPT_TIMEOUT_MS).toBeLessThanOrEqual(AI_CALL_BUDGET_MS);
    expect(AI_MAX_RETRIES).toBeGreaterThanOrEqual(1);
  });

  it("sets the route maxDuration literal on every AI route", () => {
    for (const rel of AI_ROUTES) {
      const text = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
      expect({
        rel,
        ok: text.includes(`export const maxDuration = ${AI_ROUTE_MAX_DURATION_S};`),
      }).toEqual({
        rel,
        ok: true,
      });
    }
  });
});
