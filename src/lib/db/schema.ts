import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  Bilingual,
  ExamSection,
  ExamTrack,
  McqQuestion,
  ScriptLine,
  SpeakingPartType,
  Track,
  WritingTaskType,
} from "../../content/types";
import type { SpeakingFeedback, WritingFeedback } from "../ai/schemas";
import { user } from "./auth-schema";

export * from "./auth-schema";

const now = () => new Date();
const uuid = () => crypto.randomUUID();

// timestamptz columns that round-trip JS Date, matching the previous SQLite
// `timestamp_ms` semantics.
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

// ---------------------------------------------------------------------------
// Shared row types
// ---------------------------------------------------------------------------

export type ExerciseKind = "reading" | "listening" | "vocab_quiz";
export type SubmissionStatus = "ai_scored" | "self_assessed" | "failed";
export type AttemptStatus = "in_progress" | "completed" | "expired";

export interface SectionDeadline {
  sectionId: string;
  startedAt: number;
  expiresAt: number;
}

export interface SectionScore {
  sectionId: string;
  kind: "listening" | "reading";
  raw: number;
  max: number;
}

export type ExamEstimate =
  | { kind: "toeic"; listening: number; reading: number; total: number }
  | { kind: "ielts"; band: number };

/** Answers keyed by question id (word id for vocab quizzes). */
export type AnswerMap = Record<string, number>;

// ---------------------------------------------------------------------------
// User settings
// ---------------------------------------------------------------------------

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  activeTrack: text("active_track").$type<Track>(),
  dailyGoal: integer("daily_goal").notNull().default(20),
  onboardedAt: ts("onboarded_at"),
  createdAt: ts("created_at").notNull().$defaultFn(now),
  updatedAt: ts("updated_at").notNull().$defaultFn(now),
});

// ---------------------------------------------------------------------------
// Content tables (seeded from src/content, ids are stable slugs)
// ---------------------------------------------------------------------------

export const vocabWords = pgTable(
  "vocab_words",
  {
    id: text("id").primaryKey(),
    track: text("track").$type<Track>().notNull(),
    topic: text("topic").notNull(),
    headword: text("headword").notNull(),
    ipa: text("ipa").notNull(),
    pos: text("pos").notNull(),
    definitionEn: text("definition_en").notNull(),
    translationZh: text("translation_zh").notNull(),
    exampleEn: text("example_en").notNull(),
    exampleZh: text("example_zh").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("vocab_words_track_idx").on(t.track)],
);

export const readingExercises = pgTable(
  "reading_exercises",
  {
    id: text("id").primaryKey(),
    track: text("track").$type<Track>().notNull(),
    title: text("title").notNull(),
    titleZh: text("title_zh").notNull(),
    genre: text("genre").notNull(),
    passage: text("passage").notNull(),
    suggestedMinutes: integer("suggested_minutes").notNull(),
    questions: jsonb("questions").$type<McqQuestion[]>().notNull(),
  },
  (t) => [index("reading_exercises_track_idx").on(t.track)],
);

export const listeningExercises = pgTable(
  "listening_exercises",
  {
    id: text("id").primaryKey(),
    track: text("track").$type<Track>().notNull(),
    title: text("title").notNull(),
    titleZh: text("title_zh").notNull(),
    style: text("style").notNull(),
    script: jsonb("script").$type<ScriptLine[]>().notNull(),
    questions: jsonb("questions").$type<McqQuestion[]>().notNull(),
  },
  (t) => [index("listening_exercises_track_idx").on(t.track)],
);

export const writingPrompts = pgTable(
  "writing_prompts",
  {
    id: text("id").primaryKey(),
    track: text("track").$type<Track>().notNull(),
    taskType: text("task_type").$type<WritingTaskType>().notNull(),
    title: text("title").notNull(),
    titleZh: text("title_zh").notNull(),
    promptEn: text("prompt_en").notNull(),
    promptZh: text("prompt_zh").notNull(),
    minWords: integer("min_words").notNull(),
    suggestedMinutes: integer("suggested_minutes").notNull(),
    modelAnswer: text("model_answer").notNull(),
    checklist: jsonb("checklist").$type<Bilingual[]>().notNull(),
  },
  (t) => [index("writing_prompts_track_idx").on(t.track)],
);

export const speakingPrompts = pgTable(
  "speaking_prompts",
  {
    id: text("id").primaryKey(),
    track: text("track").$type<Track>().notNull(),
    partType: text("part_type").$type<SpeakingPartType>().notNull(),
    title: text("title").notNull(),
    titleZh: text("title_zh").notNull(),
    promptEn: text("prompt_en").notNull(),
    promptZh: text("prompt_zh").notNull(),
    prepSeconds: integer("prep_seconds").notNull(),
    speakSeconds: integer("speak_seconds").notNull(),
    modelAnswer: text("model_answer").notNull(),
    checklist: jsonb("checklist").$type<Bilingual[]>().notNull(),
  },
  (t) => [index("speaking_prompts_track_idx").on(t.track)],
);

export const mockExams = pgTable("mock_exams", {
  id: text("id").primaryKey(),
  track: text("track").$type<ExamTrack>().notNull(),
  title: text("title").notNull(),
  titleZh: text("title_zh").notNull(),
  descriptionZh: text("description_zh").notNull(),
  /** Full sections including answers — must never be sent raw to the client. */
  sections: jsonb("sections").$type<ExamSection[]>().notNull(),
  totalQuestions: integer("total_questions").notNull(),
});

// ---------------------------------------------------------------------------
// User progress
// ---------------------------------------------------------------------------

export const srsCards = pgTable(
  "srs_cards",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    wordId: text("word_id")
      .notNull()
      .references(() => vocabWords.id, { onDelete: "cascade" }),
    easeFactor: doublePrecision("ease_factor").notNull().default(2.5),
    intervalDays: doublePrecision("interval_days").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    dueAt: ts("due_at").notNull(),
    lastReviewedAt: ts("last_reviewed_at"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [
    uniqueIndex("srs_cards_user_word_idx").on(t.userId, t.wordId),
    index("srs_cards_user_due_idx").on(t.userId, t.dueAt),
  ],
);

export const reviewLogs = pgTable(
  "review_logs",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    cardId: text("card_id")
      .notNull()
      .references(() => srsCards.id, { onDelete: "cascade" }),
    grade: integer("grade").notNull(),
    previousIntervalDays: doublePrecision("previous_interval_days").notNull(),
    newIntervalDays: doublePrecision("new_interval_days").notNull(),
    reviewedAt: ts("reviewed_at").notNull().$defaultFn(now),
  },
  (t) => [index("review_logs_user_idx").on(t.userId, t.reviewedAt)],
);

export const exerciseAttempts = pgTable(
  "exercise_attempts",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").$type<ExerciseKind>().notNull(),
    refId: text("ref_id").notNull(),
    track: text("track").$type<Track>().notNull(),
    answers: jsonb("answers").$type<AnswerMap>().notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    completedAt: ts("completed_at").notNull().$defaultFn(now),
  },
  (t) => [index("exercise_attempts_user_idx").on(t.userId, t.completedAt)],
);

export const writingSubmissions = pgTable(
  "writing_submissions",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    promptId: text("prompt_id")
      .notNull()
      .references(() => writingPrompts.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    wordCount: integer("word_count").notNull(),
    status: text("status").$type<SubmissionStatus>().notNull(),
    feedback: jsonb("feedback").$type<WritingFeedback | null>(),
    model: text("model"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("writing_submissions_user_idx").on(t.userId, t.createdAt)],
);

export const speakingSubmissions = pgTable(
  "speaking_submissions",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    promptId: text("prompt_id")
      .notNull()
      .references(() => speakingPrompts.id, { onDelete: "cascade" }),
    transcript: text("transcript").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    status: text("status").$type<SubmissionStatus>().notNull(),
    feedback: jsonb("feedback").$type<SpeakingFeedback | null>(),
    model: text("model"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("speaking_submissions_user_idx").on(t.userId, t.createdAt)],
);

export const mockExamAttempts = pgTable(
  "mock_exam_attempts",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    examId: text("exam_id")
      .notNull()
      .references(() => mockExams.id, { onDelete: "cascade" }),
    track: text("track").$type<ExamTrack>().notNull(),
    status: text("status").$type<AttemptStatus>().notNull().default("in_progress"),
    startedAt: ts("started_at").notNull().$defaultFn(now),
    currentSectionIndex: integer("current_section_index").notNull().default(0),
    sectionDeadlines: jsonb("section_deadlines").$type<SectionDeadline[]>().notNull(),
    answers: jsonb("answers").$type<AnswerMap>().notNull(),
    sectionScores: jsonb("section_scores").$type<SectionScore[] | null>(),
    rawScore: integer("raw_score"),
    totalQuestions: integer("total_questions").notNull(),
    estimate: jsonb("estimate").$type<ExamEstimate | null>(),
    completedAt: ts("completed_at"),
  },
  (t) => [index("mock_exam_attempts_user_idx").on(t.userId, t.startedAt)],
);

/** One row per user per local day with any learning activity; drives streaks. */
export const activityDays = pgTable(
  "activity_days",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Local date string YYYY-MM-DD. */
    day: text("day").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);
