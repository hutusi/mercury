/**
 * Postgres error inspection. Pure (no driver import) so it stays unit-testable.
 *
 * Drizzle wraps every driver failure in a `DrizzleQueryError` whose `cause`
 * is the original `pg` error, so the SQLSTATE and constraint name live one
 * level down — reading `error.code` on the wrapper never matches. Walk the
 * cause chain instead of assuming either shape.
 */

const MAX_CAUSE_DEPTH = 5;

interface PgErrorFields {
  code?: unknown;
  constraint?: unknown;
}

/** A unique violation (SQLSTATE 23505) on the named constraint or index. */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (typeof current !== "object" || current === null) return false;
    const fields = current as PgErrorFields;
    if (fields.code === "23505") return fields.constraint === constraint;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
