import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { AiUnavailableError } from "../ai/client";
import { IntegrityError, NotFoundError } from "../services/errors";
import { ApiError } from "./errors";
import { apiHandler, readJson } from "./handler";

type ErrorBody = { error: { code: string; message: string; details?: unknown } };

async function runWithError(error: unknown): Promise<{ status: number; body: ErrorBody }> {
  const handler = apiHandler(async () => {
    throw error;
  });
  const res = await handler(new Request("http://localhost/api/v1/test"), undefined);
  return { status: res.status, body: (await res.json()) as ErrorBody };
}

describe("apiHandler", () => {
  test("passes successful responses through untouched", async () => {
    const handler = apiHandler(async () => Response.json({ ok: true }, { status: 201 }));
    const res = await handler(new Request("http://localhost/api/v1/test"), undefined);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
  });

  test("ApiError maps to its own status, code and details", async () => {
    const { status, body } = await runWithError(
      new ApiError(401, "unauthorized", "Authentication required", { hint: "token" }),
    );
    expect(status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
    expect(body.error.message).toBe("Authentication required");
    expect(body.error.details).toEqual({ hint: "token" });
  });

  test("ZodError maps to 422 with issues in details", async () => {
    const { error } = z.object({ track: z.enum(["toeic", "ielts"]) }).safeParse({ track: "x" });
    const { status, body } = await runWithError(error);
    expect(status).toBe(422);
    expect(body.error.code).toBe("validation_failed");
    const issues = body.error.details as Array<{ path: Array<string | number> }>;
    expect(Array.isArray(issues)).toBe(true);
    expect(issues[0].path).toEqual(["track"]);
  });

  test("NotFoundError maps to 404", async () => {
    const { status, body } = await runWithError(new NotFoundError("Exam not found"));
    expect(status).toBe(404);
    expect(body.error).toEqual({ code: "not_found", message: "Exam not found" });
  });

  test("IntegrityError maps to 403", async () => {
    const { status, body } = await runWithError(new IntegrityError("Not an active mistake"));
    expect(status).toBe(403);
    expect(body.error).toEqual({ code: "integrity", message: "Not an active mistake" });
  });

  test("AiUnavailableError maps to 503 without leaking the internal message", async () => {
    const { status, body } = await runWithError(new AiUnavailableError("key missing"));
    expect(status).toBe(503);
    expect(body.error.code).toBe("ai_unavailable");
    expect(body.error.message).not.toContain("key");
  });

  test("unknown errors map to an opaque 500", async () => {
    const { status, body } = await runWithError(new Error("pg: connection refused"));
    expect(status).toBe(500);
    expect(body.error).toEqual({ code: "internal", message: "Internal server error" });
  });
});

describe("readJson", () => {
  function post(body: string): Request {
    return new Request("http://localhost/api/v1/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
  }

  test("returns the parsed body", async () => {
    expect(await readJson(post('{"track":"toeic"}'))).toEqual({ track: "toeic" });
  });

  test("maps malformed JSON to a 400 ApiError", async () => {
    const handler = apiHandler(async (req) => {
      await readJson(req);
      return Response.json({ ok: true });
    });
    const res = await handler(post("not json"), undefined);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_json");
  });
});
