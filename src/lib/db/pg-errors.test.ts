import { describe, expect, test } from "bun:test";
import { DrizzleQueryError } from "drizzle-orm";
import { isUniqueViolation } from "./pg-errors";

/** The shape node-postgres throws (pg-protocol's DatabaseError fields). */
function pgError(code: string, constraint?: string) {
  return Object.assign(new Error("duplicate key value violates unique constraint"), {
    code,
    constraint,
  });
}

describe("isUniqueViolation", () => {
  test("matches the driver error Drizzle wraps as its cause", () => {
    const wrapped = new DrizzleQueryError(
      "insert into review_logs ...",
      [],
      pgError("23505", "review_logs_request_idx"),
    );
    // The wrapper itself carries no SQLSTATE — the bug this helper fixes.
    expect((wrapped as { code?: unknown }).code).toBeUndefined();
    expect(isUniqueViolation(wrapped, "review_logs_request_idx")).toBe(true);
  });

  test("matches a bare driver error", () => {
    expect(
      isUniqueViolation(pgError("23505", "review_logs_request_idx"), "review_logs_request_idx"),
    ).toBe(true);
  });

  test("rejects a unique violation on a different constraint", () => {
    const wrapped = new DrizzleQueryError("", [], pgError("23505", "srs_cards_pkey"));
    expect(isUniqueViolation(wrapped, "review_logs_request_idx")).toBe(false);
  });

  test("rejects other SQLSTATEs and non-errors", () => {
    const wrapped = new DrizzleQueryError("", [], pgError("40001", "review_logs_request_idx"));
    expect(isUniqueViolation(wrapped, "review_logs_request_idx")).toBe(false);
    expect(isUniqueViolation(new Error("boom"), "review_logs_request_idx")).toBe(false);
    expect(isUniqueViolation(null, "review_logs_request_idx")).toBe(false);
    expect(isUniqueViolation("23505", "review_logs_request_idx")).toBe(false);
  });

  test("stops on a cyclic cause chain", () => {
    const a: { cause?: unknown } = {};
    const b = { cause: a };
    a.cause = b;
    expect(isUniqueViolation(a, "review_logs_request_idx")).toBe(false);
  });
});
