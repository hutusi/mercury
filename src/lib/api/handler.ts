import { ZodError } from "zod";
import { AiUnavailableError } from "../ai/client";
import { IntegrityError, NotFoundError } from "../services/errors";
import { ApiError } from "./errors";

/**
 * Error envelope shared by every /api/v1 route. `code` is the machine-readable
 * contract; `message` is English debug text (iOS owns its own user-facing copy).
 */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  return Response.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status },
  );
}

/**
 * Wrap a route handler so every thrown error becomes a JSON envelope:
 * ApiError → its status, ZodError → 422, NotFoundError → 404,
 * IntegrityError → 403, AiUnavailableError → 503, anything else → 500.
 */
export function apiHandler<Ctx>(
  fn: (req: Request, ctx: Ctx) => Promise<Response>,
): (req: Request, ctx: Ctx) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (error) {
      if (error instanceof ApiError) {
        return errorResponse(error.status, error.code, error.message, error.details);
      }
      if (error instanceof ZodError) {
        return errorResponse(422, "validation_failed", "Request failed validation", error.issues);
      }
      if (error instanceof NotFoundError) {
        return errorResponse(404, "not_found", error.message);
      }
      if (error instanceof IntegrityError) {
        return errorResponse(403, "integrity", error.message);
      }
      if (error instanceof AiUnavailableError) {
        return errorResponse(503, "ai_unavailable", "AI feedback is currently unavailable");
      }
      console.error("[api] unhandled error", error);
      return errorResponse(500, "internal", "Internal server error");
    }
  };
}

/** Parse a JSON request body; malformed JSON becomes a 400 envelope. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON");
  }
}
