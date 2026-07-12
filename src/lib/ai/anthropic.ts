import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { AiUnavailableError } from "./errors";

/**
 * Anthropic transport: structured output enforced server-side via
 * `messages.parse` + `zodOutputFormat`, so the reply is schema-valid or the
 * request fails — no client-side repair loop needed.
 */

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // TS SDK timeout is in milliseconds.
  return (client ??= new Anthropic({ timeout: 60_000, maxRetries: 2 }));
}

export async function anthropicStructuredFeedback<Schema extends z.ZodType>(req: {
  model: string;
  system: string;
  userContent: string;
  schema: Schema;
}): Promise<z.infer<Schema>> {
  let response;
  try {
    // Sonnet 5: no temperature/top_p/top_k; adaptive thinking is the default.
    response = await getClient().messages.parse({
      model: req.model,
      max_tokens: 16000,
      system: req.system,
      messages: [{ role: "user", content: req.userContent }],
      output_config: { format: zodOutputFormat(req.schema) },
    });
  } catch (error) {
    throw new AiUnavailableError("Claude API request failed", { cause: error });
  }

  if (response.stop_reason === "refusal") {
    throw new AiUnavailableError("Model refused the request");
  }
  if (response.stop_reason === "max_tokens") {
    throw new AiUnavailableError("Response truncated at max_tokens");
  }
  if (!response.parsed_output) {
    throw new AiUnavailableError("Model output did not match the schema");
  }
  return response.parsed_output;
}

/** Plain-text multi-turn chat for the tutor (no structured output). */
export async function anthropicPlainText(req: {
  model: string;
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  let response;
  try {
    // Sonnet 5: no temperature/top_p/top_k; adaptive thinking is the default.
    response = await getClient().messages.create({
      model: req.model,
      max_tokens: 1024,
      system: req.system,
      messages: req.messages,
    });
  } catch (error) {
    throw new AiUnavailableError("Claude API request failed", { cause: error });
  }

  if (response.stop_reason === "refusal") {
    throw new AiUnavailableError("Model refused the request");
  }
  // max_tokens truncation is tolerated here: a clipped chat reply beats a 503.
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
  if (!text) throw new AiUnavailableError("Model returned no text");
  return text;
}
