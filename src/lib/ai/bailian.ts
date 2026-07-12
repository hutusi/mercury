import OpenAI from "openai";
import { z } from "zod";
import { AiUnavailableError } from "./errors";

/**
 * Bailian (Alibaba Cloud Model Studio / DashScope) transport over the
 * OpenAI-compatible endpoint. Unlike the Anthropic transport there is no
 * server-enforced output schema: the JSON Schema is embedded in the system
 * prompt, the reply is validated with zod, and one repair round-trip is
 * attempted before degrading via AiUnavailableError.
 *
 * GLM structured output (`response_format: json_object`) only works in
 * non-thinking mode, so `enable_thinking: false` is always sent — never
 * enable thinking on this path.
 */

const DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  return (client ??= new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: process.env.DASHSCOPE_BASE_URL || DEFAULT_BASE_URL,
    timeout: 60_000,
    maxRetries: 2,
  }));
}

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

async function requestOnce(api: OpenAI, model: string, messages: ChatMessage[]): Promise<string> {
  let response: OpenAI.Chat.Completions.ChatCompletion;
  try {
    response = await api.chat.completions.create({
      model,
      messages,
      max_tokens: 8000,
      response_format: { type: "json_object" },
      // DashScope passthrough flag; see module comment.
      enable_thinking: false,
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming);
  } catch (error) {
    throw new AiUnavailableError("Bailian API request failed", { cause: error });
  }

  const choice = response.choices?.[0];
  if (!choice) throw new AiUnavailableError("Bailian returned no choices");
  if (choice.finish_reason === "length") {
    throw new AiUnavailableError("Response truncated at max_tokens");
  }
  const content = choice.message?.content;
  if (!content) throw new AiUnavailableError("Bailian returned empty content");
  return content;
}

/** json_object mode should forbid fences, but strip them defensively anyway. */
function stripFences(reply: string): string {
  const trimmed = reply.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  return fenced ? fenced[1] : trimmed;
}

type ParseAttempt<T> = { success: true; data: T } | { success: false; problem: string };

function tryParse<Schema extends z.ZodType>(
  reply: string,
  schema: Schema,
): ParseAttempt<z.infer<Schema>> {
  let json: unknown;
  try {
    json = JSON.parse(stripFences(reply));
  } catch (error) {
    return { success: false, problem: `Reply is not valid JSON: ${String(error)}` };
  }
  const result = schema.safeParse(json);
  if (!result.success) return { success: false, problem: z.prettifyError(result.error) };
  return { success: true, data: result.data };
}

export async function bailianStructuredFeedback<Schema extends z.ZodType>(
  req: { model: string; system: string; userContent: string; schema: Schema },
  clientOverride?: OpenAI,
): Promise<z.infer<Schema>> {
  const api = clientOverride ?? getClient();

  const system = `${req.system}

Respond with a single JSON object only — no markdown fences, no commentary. The JSON object MUST conform to this JSON Schema:
${JSON.stringify(z.toJSONSchema(req.schema))}`;

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: req.userContent },
  ];

  const first = await requestOnce(api, req.model, messages);
  const parsed = tryParse(first, req.schema);
  if (parsed.success) return parsed.data;

  // One repair round-trip: show the model its own reply and the validation
  // problems, then re-validate. A second failure degrades.
  const repaired = await requestOnce(api, req.model, [
    ...messages,
    { role: "assistant", content: first },
    {
      role: "user",
      content: `Your previous reply did not conform to the required JSON Schema. Problems:
${parsed.problem}

Reply again with ONLY the corrected JSON object.`,
    },
  ]);
  const reparsed = tryParse(repaired, req.schema);
  if (reparsed.success) return reparsed.data;
  throw new AiUnavailableError("Model output did not match the schema");
}
