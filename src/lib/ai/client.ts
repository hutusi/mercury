import type { z } from "zod";
import type { SpeakingPartType, WritingTaskType } from "../../content/types";
import { anthropicStructuredFeedback } from "./anthropic";
import { bailianStructuredFeedback } from "./bailian";
import { AiUnavailableError } from "./errors";
import { modelForProvider, resolveAiProvider } from "./provider";
import { speakingSystemPrompt, writingSystemPrompt } from "./prompts";
import { sanitizeUntrusted } from "./sanitize";
import {
  SpeakingFeedbackSchema,
  WritingFeedbackSchema,
  type SpeakingFeedback,
  type WritingFeedback,
} from "./schemas";

/**
 * Stable AI facade. Callers (services, pages, API routes) only see
 * isAiEnabled/activeAiModel/getWritingFeedback/getSpeakingFeedback and
 * AiUnavailableError; the provider transports live in anthropic.ts and
 * bailian.ts, selected by provider.ts. Every transport failure surfaces as
 * AiUnavailableError so the self-assessment degradation contract holds
 * regardless of provider.
 */

export { AiUnavailableError } from "./errors";

export function isAiEnabled(): boolean {
  return resolveAiProvider() !== null;
}

/** Model id persisted with AI-scored submissions; null when AI is disabled. */
export function activeAiModel(): string | null {
  const provider = resolveAiProvider();
  return provider ? modelForProvider(provider) : null;
}

async function requestStructuredFeedback<Schema extends z.ZodType>(
  system: string,
  userContent: string,
  schema: Schema,
): Promise<z.infer<Schema>> {
  const provider = resolveAiProvider();
  if (!provider) {
    throw new AiUnavailableError("No AI provider is configured");
  }
  const req = { model: modelForProvider(provider), system, userContent, schema };
  return provider === "anthropic"
    ? anthropicStructuredFeedback(req)
    : bailianStructuredFeedback(req);
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
