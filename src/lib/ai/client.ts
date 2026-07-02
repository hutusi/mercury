import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import type { SpeakingPartType, WritingTaskType } from "../../content/types";
import { speakingSystemPrompt, writingSystemPrompt } from "./prompts";
import {
  SpeakingFeedbackSchema,
  WritingFeedbackSchema,
  type SpeakingFeedback,
  type WritingFeedback,
} from "./schemas";

export const AI_MODEL = process.env.MERCURY_AI_MODEL || "claude-sonnet-5";

/** Thrown when AI feedback cannot be produced; callers degrade to self-assessment. */
export class AiUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiUnavailableError";
  }
}

export function isAiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // TS SDK timeout is in milliseconds.
  return (client ??= new Anthropic({ timeout: 60_000, maxRetries: 2 }));
}

/**
 * Learner text is untrusted: neutralize angle brackets so it cannot close our
 * delimiter tags and smuggle instructions into the grading prompt. Full-width
 * equivalents keep the text readable for the grader.
 */
function sanitizeUntrusted(text: string): string {
  return text.replace(/</g, "＜").replace(/>/g, "＞");
}

async function requestStructuredFeedback<Schema extends z.ZodType>(
  system: string,
  userContent: string,
  schema: Schema,
): Promise<z.infer<Schema>> {
  if (!isAiEnabled()) {
    throw new AiUnavailableError("ANTHROPIC_API_KEY is not configured");
  }

  let response;
  try {
    // Sonnet 5: no temperature/top_p/top_k; adaptive thinking is the default.
    response = await getClient().messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: userContent }],
      output_config: { format: zodOutputFormat(schema) },
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

export async function getWritingFeedback(req: {
  taskType: WritingTaskType;
  promptEn: string;
  userText: string;
  wordCount: number;
}): Promise<WritingFeedback> {
  const userContent = `<task>
${req.promptEn}
</task>

<learner_response word_count="${req.wordCount}">
${sanitizeUntrusted(req.userText)}
</learner_response>

Grade the learner's response to the task above and produce the structured feedback.`;
  return requestStructuredFeedback(
    writingSystemPrompt(req.taskType),
    userContent,
    WritingFeedbackSchema,
  );
}

export async function getSpeakingFeedback(req: {
  partType: SpeakingPartType;
  promptEn: string;
  transcript: string;
  durationSeconds: number;
}): Promise<SpeakingFeedback> {
  const userContent = `<task>
${req.promptEn}
</task>

<transcript duration_seconds="${req.durationSeconds}">
${sanitizeUntrusted(req.transcript)}
</transcript>

Evaluate the learner's spoken answer (transcribed above) and produce the structured feedback.`;
  return requestStructuredFeedback(
    speakingSystemPrompt(req.partType),
    userContent,
    SpeakingFeedbackSchema,
  );
}
