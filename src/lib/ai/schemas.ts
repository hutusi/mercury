import { z } from "zod";

/**
 * Structured feedback shapes returned by Claude. Shared by the server-side
 * API call (as the enforced output schema) and the client panels that render
 * stored feedback. Explanatory text is Simplified Chinese; language samples
 * stay in English.
 */

/**
 * The grader's notes for the learner's file, merged into
 * learner_profiles.coachMemo (learner-model-core.mergeCoachMemo). Optional on
 * both feedback schemas — it is load-bearing that old stored feedback rows
 * (which predate the field) still satisfy the jsonb column types.
 */
export const MemoUpdateSchema = z.object({
  issues: z.array(z.object({ tag: z.string(), noteZh: z.string() })).max(3),
  strengths: z.array(z.object({ tag: z.string(), noteZh: z.string() })).max(2),
});
export type AiMemoUpdate = z.infer<typeof MemoUpdateSchema>;

export const WritingFeedbackSchema = z.object({
  /** IELTS band (0-9, halves allowed) or a 0-100 rubric score for business tasks. */
  overallScore: z.number(),
  /** Human-readable label, e.g. "Band 6.5" or "82/100". */
  scoreLabel: z.string(),
  criteria: z.array(
    z.object({
      name: z.string(),
      nameZh: z.string(),
      score: z.number(),
      commentZh: z.string(),
    }),
  ),
  strengths: z.array(z.object({ en: z.string(), zh: z.string() })),
  issues: z.array(
    z.object({
      quote: z.string(),
      problemZh: z.string(),
      suggestionEn: z.string(),
    }),
  ),
  rewrittenSample: z.string(),
  summaryZh: z.string(),
  memoUpdate: MemoUpdateSchema.optional(),
});
export type WritingFeedback = z.infer<typeof WritingFeedbackSchema>;

const SpeakingCriterionSchema = z.object({
  score: z.number(),
  commentZh: z.string(),
});

export const SpeakingFeedbackSchema = z.object({
  overallScore: z.number(),
  scoreLabel: z.string(),
  fluency: SpeakingCriterionSchema,
  vocabulary: SpeakingCriterionSchema,
  grammar: SpeakingCriterionSchema,
  suggestions: z.array(z.object({ en: z.string(), zh: z.string() })),
  betterPhrases: z.array(
    z.object({
      original: z.string(),
      improved: z.string(),
      noteZh: z.string(),
    }),
  ),
  summaryZh: z.string(),
  memoUpdate: MemoUpdateSchema.optional(),
});
export type SpeakingFeedback = z.infer<typeof SpeakingFeedbackSchema>;
