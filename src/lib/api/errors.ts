/**
 * HTTP-aware error for API route handlers. Thrown anywhere inside an
 * `apiHandler`-wrapped route and rendered as the JSON error envelope
 * `{ error: { code, message, details? } }` with the given status.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
