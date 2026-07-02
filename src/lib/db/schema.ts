import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
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

export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  activeTrack: text("active_track").$type<Track>(),
  dailyGoal: integer("daily_goal").notNull().default(20),
  onboardedAt: integer("onboarded_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
});

// ---------------------------------------------------------------------------
// Content tables (seeded from src/content, ids are stable slugs)
// ---------------------------------------------------------------------------

export const vocabWords = sqliteTable(
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

export const readingExercises = sqliteTable(
  "reading_exercises",
  {
    id: text("id").primaryKey(),
    track: text("track").$type<Track>().notNull(),
    title: text("title").notNull(),
    titleZh: text("title_zh").notNull(),
    genre: text("genre").notNull(),
    passage: text("passage").notNull(),
    suggestedMinutes: integer("suggested_minutes").notNull(),
    questions: text("questions", { mode: "json" }).$type<McqQuestion[]>().notNull(),
  },
  (t) => [index("reading_exercises_track_idx").on(t.track)],
);

export const listeningExercises = sqliteTable(
  "listening_exercises",
  {
    id: text("id").primaryKey(),
    track: text("track").$type<Track>().notNull(),
    title: text("title").notNull(),
    titleZh: text("title_zh").notNull(),
    style: text("style").notNull(),
    script: text("script", { mode: "json" }).$type<ScriptLine[]>().notNull(),
    questions: text("questions", { mode: "json" }).$type<McqQuestion[]>().notNull(),
  },
  (t) => [index("listening_exercises_track_idx").on(t.track)],
);

export const writingPrompts = sqliteTable(
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
    checklist: text("checklist", { mode: "json" }).$type<Bilingual[]>().notNull(),
  },
  (t) => [index("writing_prompts_track_idx").on(t.track)],
);

export const speakingPrompts = sqliteTable(
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
    checklist: text("checklist", { mode: "json" }).$type<Bilingual[]>().notNull(),
  },
  (t) => [index("speaking_prompts_track_idx").on(t.track)],
);

export const mockExams = sqliteTable("mock_exams", {
  id: text("id").primaryKey(),
  track: text("track").$type<ExamTrack>().notNull(),
  title: text("title").notNull(),
  titleZh: text("title_zh").notNull(),
  descriptionZh: text("description_zh").notNull(),
  /** Full sections including answers — must never be sent raw to the client. */
  sections: text("sections", { mode: "json" }).$type<ExamSection[]>().notNull(),
  totalQuestions: integer("total_questions").notNull(),
});

// ---------------------------------------------------------------------------
// User progress
// ---------------------------------------------------------------------------

export const srsCards = sqliteTable(
  "srs_cards",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    wordId: text("word_id")
      .notNull()
      .references(() => vocabWords.id, { onDelete: "cascade" }),
    easeFactor: real("ease_factor").notNull().default(2.5),
    intervalDays: real("interval_days").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    dueAt: integer("due_at", { mode: "timestamp_ms" }).notNull(),
    lastReviewedAt: integer("last_reviewed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
  },
  (t) => [
    uniqueIndex("srs_cards_user_word_idx").on(t.userId, t.wordId),
    index("srs_cards_user_due_idx").on(t.userId, t.dueAt),
  ],
);

export const reviewLogs = sqliteTable(
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
    previousIntervalDays: real("previous_interval_days").notNull(),
    newIntervalDays: real("new_interval_days").notNull(),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
  },
  (t) => [index("review_logs_user_idx").on(t.userId, t.reviewedAt)],
);

export const exerciseAttempts = sqliteTable(
  "exercise_attempts",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").$type<ExerciseKind>().notNull(),
    refId: text("ref_id").notNull(),
    track: text("track").$type<Track>().notNull(),
    answers: text("answers", { mode: "json" }).$type<AnswerMap>().notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
  },
  (t) => [index("exercise_attempts_user_idx").on(t.userId, t.completedAt)],
);

export const writingSubmissions = sqliteTable(
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
    feedback: text("feedback", { mode: "json" }).$type<WritingFeedback | null>(),
    model: text("model"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
  },
  (t) => [index("writing_submissions_user_idx").on(t.userId, t.createdAt)],
);

export const speakingSubmissions = sqliteTable(
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
    feedback: text("feedback", { mode: "json" }).$type<SpeakingFeedback | null>(),
    model: text("model"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
  },
  (t) => [index("speaking_submissions_user_idx").on(t.userId, t.createdAt)],
);

export const mockExamAttempts = sqliteTable(
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
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
    currentSectionIndex: integer("current_section_index").notNull().default(0),
    sectionDeadlines: text("section_deadlines", { mode: "json" })
      .$type<SectionDeadline[]>()
      .notNull(),
    answers: text("answers", { mode: "json" }).$type<AnswerMap>().notNull(),
    sectionScores: text("section_scores", { mode: "json" }).$type<SectionScore[] | null>(),
    rawScore: integer("raw_score"),
    totalQuestions: integer("total_questions").notNull(),
    estimate: text("estimate", { mode: "json" }).$type<ExamEstimate | null>(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("mock_exam_attempts_user_idx").on(t.userId, t.startedAt)],
);

/** One row per user per local day with any learning activity; drives streaks. */
export const activityDays = sqliteTable(
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
