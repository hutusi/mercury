import { z } from "zod";

/**
 * Content model shared by the seed data, the DB schema's JSON columns,
 * and the feature UIs. Content is inherently bilingual: learning material
 * is English, scaffolding (translations, explanations) is Simplified Chinese.
 */

export const TRACKS = ["toeic", "ielts", "business"] as const;
export const TrackSchema = z.enum(TRACKS);
export type Track = z.infer<typeof TrackSchema>;

export const EXAM_TRACKS = ["toeic", "ielts"] as const;
export const ExamTrackSchema = z.enum(EXAM_TRACKS);
export type ExamTrack = z.infer<typeof ExamTrackSchema>;

export const BilingualSchema = z.object({ en: z.string(), zh: z.string() });
export type Bilingual = z.infer<typeof BilingualSchema>;

export const McqQuestionSchema = z.object({
  id: z.string(),
  stem: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanationZh: z.string(),
});
export type McqQuestion = z.infer<typeof McqQuestionSchema>;

/** Question shape sent to the client while answering: no answer, no explanation. */
export type SanitizedQuestion = Omit<McqQuestion, "correctIndex" | "explanationZh">;

export const ScriptLineSchema = z.object({
  speaker: z.enum(["A", "B", "narrator"]),
  text: z.string(),
});
export type ScriptLine = z.infer<typeof ScriptLineSchema>;

export const VocabWordSchema = z.object({
  id: z.string(),
  track: TrackSchema,
  topic: z.string(),
  headword: z.string(),
  ipa: z.string(),
  pos: z.string(),
  definitionEn: z.string(),
  translationZh: z.string(),
  exampleEn: z.string(),
  exampleZh: z.string(),
});
export type VocabWord = z.infer<typeof VocabWordSchema>;

export const ReadingExerciseSchema = z.object({
  id: z.string(),
  track: TrackSchema,
  title: z.string(),
  titleZh: z.string(),
  genre: z.string(),
  passage: z.string(),
  suggestedMinutes: z.number().int().positive(),
  questions: z.array(McqQuestionSchema).min(1),
});
export type ReadingExercise = z.infer<typeof ReadingExerciseSchema>;

export const ListeningExerciseSchema = z.object({
  id: z.string(),
  track: TrackSchema,
  title: z.string(),
  titleZh: z.string(),
  style: z.string(),
  script: z.array(ScriptLineSchema).min(1),
  questions: z.array(McqQuestionSchema).min(1),
});
export type ListeningExercise = z.infer<typeof ListeningExerciseSchema>;

export const WRITING_TASK_TYPES = [
  "ielts_task1",
  "ielts_task2",
  "opinion_essay",
  "business_email",
  "business_report",
] as const;
export const WritingTaskTypeSchema = z.enum(WRITING_TASK_TYPES);
export type WritingTaskType = z.infer<typeof WritingTaskTypeSchema>;

export const WritingPromptSchema = z.object({
  id: z.string(),
  track: TrackSchema,
  taskType: WritingTaskTypeSchema,
  title: z.string(),
  titleZh: z.string(),
  promptEn: z.string(),
  promptZh: z.string(),
  minWords: z.number().int().positive(),
  suggestedMinutes: z.number().int().positive(),
  modelAnswer: z.string(),
  checklist: z.array(BilingualSchema).min(3),
});
export type WritingPrompt = z.infer<typeof WritingPromptSchema>;

export const SPEAKING_PART_TYPES = [
  "ielts_part1",
  "ielts_part2",
  "ielts_part3",
  "qa_response",
  "business_scenario",
] as const;
export const SpeakingPartTypeSchema = z.enum(SPEAKING_PART_TYPES);
export type SpeakingPartType = z.infer<typeof SpeakingPartTypeSchema>;

export const SpeakingPromptSchema = z.object({
  id: z.string(),
  track: TrackSchema,
  partType: SpeakingPartTypeSchema,
  title: z.string(),
  titleZh: z.string(),
  promptEn: z.string(),
  promptZh: z.string(),
  prepSeconds: z.number().int().nonnegative(),
  speakSeconds: z.number().int().positive(),
  modelAnswer: z.string(),
  checklist: z.array(BilingualSchema).min(3),
});
export type SpeakingPrompt = z.infer<typeof SpeakingPromptSchema>;

export const ExamGroupSchema = z.object({
  id: z.string(),
  /** Reading material shown alongside the questions. */
  passage: z.string().optional(),
  /** Listening script, played via TTS and hidden until review. */
  script: z.array(ScriptLineSchema).optional(),
  questions: z.array(McqQuestionSchema).min(1),
});
export type ExamGroup = z.infer<typeof ExamGroupSchema>;

export const ExamSectionSchema = z.object({
  id: z.string(),
  kind: z.enum(["listening", "reading"]),
  title: z.string(),
  titleZh: z.string(),
  durationSeconds: z.number().int().positive(),
  groups: z.array(ExamGroupSchema).min(1),
});
export type ExamSection = z.infer<typeof ExamSectionSchema>;

export const MockExamSchema = z.object({
  id: z.string(),
  track: ExamTrackSchema,
  title: z.string(),
  titleZh: z.string(),
  descriptionZh: z.string(),
  sections: z.array(ExamSectionSchema).min(1),
});
export type MockExam = z.infer<typeof MockExamSchema>;

export function examQuestionCount(exam: Pick<MockExam, "sections">): number {
  return exam.sections.reduce(
    (total, section) =>
      total + section.groups.reduce((n, group) => n + group.questions.length, 0),
    0,
  );
}
