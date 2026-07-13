/**
 * Domain errors thrown by service functions. Server actions let them surface
 * as-is (same behavior as the plain Errors they replace); API route handlers
 * map them to HTTP statuses in `src/lib/api/handler.ts`.
 */

/** The referenced resource does not exist or is not visible to this user. → 404 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/** The mutation is not allowed in the current state (integrity guard). → 403 */
export class IntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrityError";
  }
}

/** A per-user usage cap was hit (e.g. daily tutor messages). → 429 */
export class LimitExceededError extends Error {
  readonly code: string;

  constructor(message: string, code = "chat_limit_reached") {
    super(message);
    this.name = "LimitExceededError";
    this.code = code;
  }
}

/** A request conflicts with already-persisted state. → 409 */
export class ConflictError extends Error {
  readonly code: string;

  constructor(message: string, code = "conflict") {
    super(message);
    this.name = "ConflictError";
    this.code = code;
  }
}

/** An ephemeral server-owned resource has expired. → 410 */
export class ExpiredError extends Error {
  readonly code: string;

  constructor(message: string, code = "expired") {
    super(message);
    this.name = "ExpiredError";
    this.code = code;
  }
}
