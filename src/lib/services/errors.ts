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
  constructor(message: string) {
    super(message);
    this.name = "LimitExceededError";
  }
}
