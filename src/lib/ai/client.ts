import type { z } from "zod";
import type { SpeakingPartType, WritingTaskType } from "../../content/types";
import { anthropicPlainText, anthropicStructuredFeedback } from "./anthropic";
import { bailianPlainText, bailianStructuredFeedback } from "./bailian";
import { AiUnavailableError } from "./errors";
import { modelForProvider, resolveAiProvider } from "./provider";
import { speakingSystemPrompt, tutorSystemPrompt, writingSystemPrompt } from "./prompts";
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

/**
 * Server-composed learner context (formatLearnerContext output) becomes the
 * <learner_profile> block; memo strings inside were sanitized at compose time.
 */
function learnerProfileBlock(learnerContext: string | undefined): string {
  return learnerContext ? `<learner_profile>\n${learnerContext}\n</learner_profile>\n\n` : "";
}

export async function getWritingFeedback(req: {
  taskType: WritingTaskType;
  promptEn: string;
  userText: string;
  wordCount: number;
  learnerContext?: string;
}): Promise<WritingFeedback> {
  const userContent = `${learnerProfileBlock(req.learnerContext)}<task>
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
  learnerContext?: string;
}): Promise<SpeakingFeedback> {
  const userContent = `${learnerProfileBlock(req.learnerContext)}<task>
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

/**
 * One tutor-chat reply (plain text, both providers). User turns are untrusted
 * and sanitized here; the system prompt carries the learner profile.
 */
export async function getTutorReply(req: {
  learnerContext: string | null;
  messages: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const provider = resolveAiProvider();
  if (!provider) {
    throw new AiUnavailableError("No AI provider is configured");
  }
  const chatReq = {
    model: modelForProvider(provider),
    system: tutorSystemPrompt(req.learnerContext),
    messages: req.messages.map((m) =>
      m.role === "user" ? { ...m, content: sanitizeUntrusted(m.content) } : m,
    ),
  };
  return provider === "anthropic" ? anthropicPlainText(chatReq) : bailianPlainText(chatReq);
}
