import { describe, expect, test } from "bun:test";
import OpenAI from "openai";
import { z } from "zod";
import { bailianStructuredFeedback } from "./bailian";
import { AiUnavailableError } from "./errors";

const FeedbackSchema = z.object({ score: z.number(), commentZh: z.string() });
const VALID = JSON.stringify({ score: 85, commentZh: "写得不错" });

type SentBody = {
  model: string;
  messages: Array<{ role: string; content: string }>;
  response_format?: { type: string };
  enable_thinking?: boolean;
};

/**
 * OpenAI client wired to an in-memory fetch: each call pops the next scripted
 * reply. No network, no retries — transport failures must surface on the
 * first attempt.
 */
function fakeClient(replies: Array<() => Response>): { api: OpenAI; sent: SentBody[] } {
  const sent: SentBody[] = [];
  const api = new OpenAI({
    apiKey: "test-key",
    baseURL: "http://bailian.test/v1",
    maxRetries: 0,
    fetch: async (_url, init) => {
      sent.push(JSON.parse(String(init?.body)) as SentBody);
      const next = replies.shift();
      if (!next) throw new Error("fakeClient: no scripted reply left");
      return next();
    },
  });
  return { api, sent };
}

function chatReply(content: string | null, finishReason = "stop"): Response {
  return Response.json({
    id: "chatcmpl-test",
    object: "chat.completion",
    created: 0,
    model: "glm-5.2",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: finishReason }],
  });
}

function request(api: OpenAI) {
  return bailianStructuredFeedback(
    {
      model: "glm-5.2",
      system: "You are a grader.",
      userContent: "Grade this.",
      schema: FeedbackSchema,
    },
    api,
  );
}

describe("bailianStructuredFeedback", () => {
  test("parses a valid JSON reply and sends the structured-output request shape", async () => {
    const { api, sent } = fakeClient([() => chatReply(VALID)]);
    const result = await request(api);
    expect(result).toEqual({ score: 85, commentZh: "写得不错" });

    expect(sent).toHaveLength(1);
    const body = sent[0];
    expect(body.model).toBe("glm-5.2");
    expect(body.response_format).toEqual({ type: "json_object" });
    // GLM structured output only works in non-thinking mode.
    expect(body.enable_thinking).toBe(false);
    expect(body.messages[0].role).toBe("system");
    // The zod-derived JSON Schema rides in the system prompt.
    expect(body.messages[0].content).toContain('"commentZh"');
    expect(body.messages[1]).toEqual({ role: "user", content: "Grade this." });
  });

  test("accepts a fenced reply defensively", async () => {
    const { api } = fakeClient([() => chatReply("```json\n" + VALID + "\n```")]);
    expect(await request(api)).toEqual({ score: 85, commentZh: "写得不错" });
  });

  test("repairs once: schema-invalid first reply triggers a corrective round-trip", async () => {
    const bad = JSON.stringify({ score: "eighty-five" });
    const { api, sent } = fakeClient([() => chatReply(bad), () => chatReply(VALID)]);
    expect(await request(api)).toEqual({ score: 85, commentZh: "写得不错" });

    expect(sent).toHaveLength(2);
    const repair = sent[1].messages;
    // The repair turn replays the model's own reply plus the problems.
    expect(repair[2]).toEqual({ role: "assistant", content: bad });
    expect(repair[3].role).toBe("user");
    expect(repair[3].content).toContain("did not conform");
  });

  test("degrades after a failed repair", async () => {
    const { api, sent } = fakeClient([() => chatReply("not json"), () => chatReply("{}")]);
    await expect(request(api)).rejects.toThrow(AiUnavailableError);
    expect(sent).toHaveLength(2);
  });

  test("degrades on truncated output", async () => {
    const { api } = fakeClient([() => chatReply(VALID, "length")]);
    await expect(request(api)).rejects.toThrow(AiUnavailableError);
  });

  test("degrades on empty content", async () => {
    const { api } = fakeClient([() => chatReply(null)]);
    await expect(request(api)).rejects.toThrow(AiUnavailableError);
  });

  test("degrades on transport errors", async () => {
    const { api } = fakeClient([
      () => Response.json({ error: { message: "boom" } }, { status: 500 }),
    ]);
    await expect(request(api)).rejects.toThrow(AiUnavailableError);
  });
});
