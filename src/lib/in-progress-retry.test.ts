import { describe, expect, it } from "bun:test";
import { retryWhileInProgress } from "./in-progress-retry";

type R = { ok: true; id: string } | { ok: false; reason: "in_progress" };
const inProgress = (r: R) => !r.ok && r.reason === "in_progress";

describe("retryWhileInProgress", () => {
  it("returns a settled first result without waiting", async () => {
    let sleeps = 0;
    const r = await retryWhileInProgress<R>(async () => ({ ok: true, id: "a" }), inProgress, {
      sleep: async () => void sleeps++,
    });
    expect(r).toEqual({ ok: true, id: "a" });
    expect(sleeps).toBe(0);
  });

  it("re-asks until the owning request finishes", async () => {
    const replies: R[] = [
      { ok: false, reason: "in_progress" },
      { ok: false, reason: "in_progress" },
      { ok: true, id: "done" },
    ];
    let waits = 0;
    const r = await retryWhileInProgress<R>(async () => replies.shift()!, inProgress, {
      sleep: async () => {},
      onWait: () => waits++,
    });
    expect(r).toEqual({ ok: true, id: "done" });
    expect(waits).toBe(2);
  });

  it("gives up after maxAttempts and returns the last in-progress result", async () => {
    let calls = 0;
    const r = await retryWhileInProgress<R>(
      async () => {
        calls++;
        return { ok: false, reason: "in_progress" };
      },
      inProgress,
      { maxAttempts: 3, sleep: async () => {} },
    );
    expect(calls).toBe(3);
    expect(inProgress(r)).toBe(true);
  });
});
