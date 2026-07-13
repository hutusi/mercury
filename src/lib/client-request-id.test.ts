import { describe, expect, test } from "bun:test";
import { requestIdForInput, type LogicalRequestId } from "./client-request-id";

describe("requestIdForInput", () => {
  test("reuses an id for the same logical input after an ambiguous failure", () => {
    let generated = 0;
    const createId = () => `request-${++generated}`;

    const first = requestIdForInput(null, "same essay", createId);
    const replay = requestIdForInput(first, "same essay", createId);

    expect(replay).toEqual(first);
    expect(generated).toBe(1);
  });

  test("rotates the id after the logical input changes or state is reset", () => {
    let generated = 0;
    const createId = () => `request-${++generated}`;

    const first = requestIdForInput(null, "draft one", createId);
    const changed = requestIdForInput(first, "draft two", createId);
    const reset = requestIdForInput(null, "draft two", createId);

    expect(changed.requestId).not.toBe(first.requestId);
    expect(reset.requestId).not.toBe(changed.requestId);
    expect(generated).toBe(3);
  });

  test("returns a serializable state for a component ref", () => {
    const state: LogicalRequestId = requestIdForInput(null, "input", () => "request-id");
    expect(state).toEqual({ fingerprint: "input", requestId: "request-id" });
  });
});
