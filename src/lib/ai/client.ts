import type { z } from "zod";
import type { SpeakingPartType, WritingTaskType } from "../../content/types";
import { anthropicPlainText, anthropicStructuredFeedback } from "./anthropic";
import { bailianPlainText, bailianStructuredFeedback } from "./bailian";
import { AiUnavailableError } from "./errors";
import { modelForProvider, resolveAiProvider } from "./provider";
import {
  bookTutorSystemPrompt,
  speakingSystemPrompt,
  tutorSystemPrompt,
  writingSystemPrompt,
} from "./prompts";
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
 * Tooling-grade structured call for authoring-time scripts (e.g.
 * scripts/generate-book-questions.ts): same provider resolution, transports,
 * schema enforcement, and AiUnavailableError as the graders, but with a
 * caller-supplied prompt. Runtime app code must not use this — feature calls
 * get a dedicated wrapper with a reviewed prompt (and for books, ADR 0024
 * forbids runtime generation outright).
 */
export async function getStructuredDraft<Schema extends z.ZodType>(req: {
  system: string;
  userContent: string;
  schema: Schema;
}): Promise<z.infer<Schema>> {
  return requestStructuredFeedback(req.system, req.userContent, req.schema);
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
 * Shared plain-text chat dispatch: provider selection and user-turn
 * sanitization live here so both tutor surfaces cannot drift apart.
 */
async function plainTextChat(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<string> {
  const provider = resolveAiProvider();
  if (!provider) {
    throw new AiUnavailableError("No AI provider is configured");
  }
  const chatReq = {
    model: modelForProvider(provider),
    system,
    messages: messages.map((m) =>
      m.role === "user" ? { ...m, content: sanitizeUntrusted(m.content) } : m,
    ),
  };
  return provider === "anthropic" ? anthropicPlainText(chatReq) : bailianPlainText(chatReq);
}

/**
 * One tutor-chat reply (plain text, both providers). User turns are untrusted
 * and sanitized at dispatch; the system prompt carries the learner profile.
 */
export async function getTutorReply(req: {
  learnerContext: string | null;
  messages: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  return plainTextChat(tutorSystemPrompt(req.learnerContext), req.messages);
}

/**
 * One book-tutor-chat reply (ADR 0030; plain text, both providers).
 * bookContext is the buildBookChatContext block — assembled server-side from
 * whitelisted chapter data, so quiz answers are structurally absent from the
 * prompt, and it rides the system prompt for provider prompt caching.
 */
export async function getBookTutorReply(req: {
  bookContext: string;
  learnerContext: string | null;
  messages: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  return plainTextChat(bookTutorSystemPrompt(req.bookContext, req.learnerContext), req.messages);
}
