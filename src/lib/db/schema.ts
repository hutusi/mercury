import { sql } from "drizzle-orm";
import {
  boolean,
  check,
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
  ExamTrack,
  McqQuestion,
  ScriptLine,
  SpeakingPartType,
  Track,
  WritingTaskType,
} from "../../content/types";
import type { SpeakingFeedback, WritingFeedback } from "../ai/schemas";
import type { SeededExamSection } from "../exam-utils";
import type { CoachMemo, SelfRatedLevel, SkillEstimates } from "../learner-model-core";
import type { MistakeKind } from "../mistakes-core";
import type { StoredQuizQuestion } from "../vocab-quiz-core";
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
export type AttemptStatus = "in_progress" | "completed" | "abandoned";
export type QuizPurpose = "practice" | "mistake_retest";
export type AiGradingKind = "writing" | "speaking";
export type AiGradingRequestStatus = "in_progress" | "completed" | "failed";

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
export type QuizSessionAnswers = Record<string, string>;

// ---------------------------------------------------------------------------
// User settings
// ---------------------------------------------------------------------------

export const userSettings = pgTable(
  "user_settings",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    /** IANA timezone used for learner-day quotas, plans, reminders, and streaks. */
    timeZone: text("time_zone").notNull().default("Asia/Shanghai"),
    dailyGoal: integer("daily_goal").notNull().default(20),
    // Controls the dashboard study nudge today; opted-in channel reminders
    // (email/push) will reuse it when a delivery provider lands.
    remindersEnabled: boolean("reminders_enabled").notNull().default(true),
    onboardedAt: ts("onboarded_at"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
    updatedAt: ts("updated_at").notNull().$defaultFn(now),
  },
  (t) => [
    check("user_settings_daily_goal_check", sql`${t.dailyGoal} >= 1`),
    check("user_settings_time_zone_check", sql`length(${t.timeZone}) between 1 and 100`),
  ],
);

// ---------------------------------------------------------------------------
// Learner profile (the AI tutor's model of the user)
// ---------------------------------------------------------------------------

/**
 * Goals + measured state per learner. skillEstimates/coachMemo are
 * server-owned: they evolve via learner-model-core from practice signals and
 * AI grading, never from client writes. dailyMinutes deliberately does not
 * reuse user_settings.dailyGoal (a card count baked into the v1 API contract).
 */
export const learnerProfiles = pgTable(
  "learner_profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    /**
     * The learner's goal track — the only track state. Null only before
     * onboarding; once set it can change but never clear (the guards key
     * onboarding on its presence).
     */
    goalTrack: text("goal_track").$type<Track>(),
    /** TOEIC 10–990; IELTS stored as band×10 (65 = band 6.5). */
    targetScore: integer("target_score"),
    /** Local date string YYYY-MM-DD, same convention as activity_days.day. */
    examDate: text("exam_date"),
    dailyMinutes: integer("daily_minutes").notNull().default(20),
    selfRatedLevel: text("self_rated_level").$type<SelfRatedLevel>(),
    skillEstimates: jsonb("skill_estimates").$type<SkillEstimates>().notNull(),
    coachMemo: jsonb("coach_memo").$type<CoachMemo>().notNull(),
    createdAt: ts("created_at").notNull().$defaultFn(now),
    updatedAt: ts("updated_at").notNull().$defaultFn(now),
  },
  (t) => [
    check(
      "learner_profiles_goal_track_check",
      sql`${t.goalTrack} is null or ${t.goalTrack} in ('toeic', 'ielts', 'business')`,
    ),
    check(
      "learner_profiles_target_score_check",
      sql`${t.targetScore} is null or ${t.targetScore} between 10 and 990`,
    ),
    check(
      "learner_profiles_exam_date_check",
      sql`${t.examDate} is null or ${t.examDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`,
    ),
    check("learner_profiles_daily_minutes_check", sql`${t.dailyMinutes} between 5 and 180`),
    check(
      "learner_profiles_self_level_check",
      sql`${t.selfRatedLevel} is null or ${t.selfRatedLevel} in ('novice', 'elementary', 'intermediate', 'upper', 'advanced')`,
    ),
  ],
);

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
    // Pre-generated neural audio (ADR 0021); null degrades to browser TTS.
    // Seed-owned: linked only when the manifest hash matches the seeded script.
    audioUrl: text("audio_url"),
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
  sections: jsonb("sections").$type<SeededExamSection[]>().notNull(),
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
    check("srs_cards_ease_check", sql`${t.easeFactor} >= 1.3`),
    check("srs_cards_interval_check", sql`${t.intervalDays} >= 0`),
    check("srs_cards_counts_check", sql`${t.repetitions} >= 0 and ${t.lapses} >= 0`),
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
  (t) => [
    index("review_logs_user_idx").on(t.userId, t.reviewedAt),
    check("review_logs_grade_check", sql`${t.grade} between 0 and 5`),
    check(
      "review_logs_intervals_check",
      sql`${t.previousIntervalDays} >= 0 and ${t.newIntervalDays} >= 0`,
    ),
  ],
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
    // Client-supplied idempotency key + graded-input fingerprint. Nullable so
    // historical rows and the backfill are unaffected; new writes always set
    // both (see submitExerciseAttemptForUser).
    requestId: text("request_id"),
    inputHash: text("input_hash"),
  },
  (t) => [
    index("exercise_attempts_user_idx").on(t.userId, t.completedAt),
    index("exercise_attempts_user_kind_ref_idx").on(t.userId, t.kind, t.refId),
    uniqueIndex("exercise_attempts_request_idx")
      .on(t.userId, t.requestId)
      .where(sql`${t.requestId} is not null`),
    check("exercise_attempts_kind_check", sql`${t.kind} in ('reading', 'listening', 'vocab_quiz')`),
    check("exercise_attempts_track_check", sql`${t.track} in ('toeic', 'ielts', 'business')`),
    check(
      "exercise_attempts_score_check",
      sql`${t.total} > 0 and ${t.score} between 0 and ${t.total}`,
    ),
    check("exercise_attempts_duration_check", sql`${t.durationSeconds} >= 0`),
  ],
);

/**
 * Server-owned quiz state. Public questions are sanitized from `questions`;
 * hidden word ids never cross the interface until an answer has been graded.
 */
export const vocabQuizSessions = pgTable(
  "vocab_quiz_sessions",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    track: text("track").$type<Track>().notNull(),
    purpose: text("purpose").$type<QuizPurpose>().notNull(),
    sourceWordId: text("source_word_id").references(() => vocabWords.id, { onDelete: "cascade" }),
    /** Mistake generation authorized when a re-test session was issued. */
    sourceMistakeAt: ts("source_mistake_at"),
    questions: jsonb("questions").$type<StoredQuizQuestion[]>().notNull(),
    answers: jsonb("answers").$type<QuizSessionAnswers>().notNull().default({}),
    expiresAt: ts("expires_at").notNull(),
    consumedAt: ts("consumed_at"),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [
    index("vocab_quiz_sessions_user_created_idx").on(t.userId, t.createdAt),
    index("vocab_quiz_sessions_expires_idx").on(t.expiresAt),
    check("vocab_quiz_sessions_track_check", sql`${t.track} in ('toeic', 'ielts', 'business')`),
    check("vocab_quiz_sessions_purpose_check", sql`${t.purpose} in ('practice', 'mistake_retest')`),
    check(
      "vocab_quiz_sessions_source_check",
      sql`(${t.purpose} = 'practice' and ${t.sourceWordId} is null and ${t.sourceMistakeAt} is null) or (${t.purpose} = 'mistake_retest' and ${t.sourceWordId} is not null and ${t.sourceMistakeAt} is not null)`,
    ),
    check("vocab_quiz_sessions_expiry_check", sql`${t.expiresAt} > ${t.createdAt}`),
  ],
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
  (t) => [
    index("writing_submissions_user_idx").on(t.userId, t.createdAt),
    index("writing_submissions_user_prompt_idx").on(t.userId, t.promptId, t.createdAt),
    check(
      "writing_submissions_status_check",
      sql`${t.status} in ('ai_scored', 'self_assessed', 'failed')`,
    ),
    check("writing_submissions_word_count_check", sql`${t.wordCount} >= 0`),
    check(
      "writing_submissions_feedback_check",
      sql`${t.status} <> 'ai_scored' or (${t.feedback} is not null and ${t.model} is not null)`,
    ),
  ],
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
  (t) => [
    index("speaking_submissions_user_idx").on(t.userId, t.createdAt),
    index("speaking_submissions_user_prompt_idx").on(t.userId, t.promptId, t.createdAt),
    check(
      "speaking_submissions_status_check",
      sql`${t.status} in ('ai_scored', 'self_assessed', 'failed')`,
    ),
    check("speaking_submissions_duration_check", sql`${t.durationSeconds} between 0 and 600`),
    check(
      "speaking_submissions_feedback_check",
      sql`${t.status} <> 'ai_scored' or (${t.feedback} is not null and ${t.model} is not null)`,
    ),
  ],
);

/**
 * Learner-local daily cost ledger shared by writing and speaking graders.
 * The row is locked before a provider call is claimed, making the cap exact
 * even when requests arrive concurrently.
 */
export const aiUsageDays = pgTable(
  "ai_usage_days",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    gradingCalls: integer("grading_calls").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.day] }),
    check("ai_usage_days_day_check", sql`${t.day} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`),
    check("ai_usage_days_calls_check", sql`${t.gradingCalls} >= 0`),
  ],
);

/**
 * Idempotency + lease ledger for paid grading calls. `claimId` changes on
 * every stale reclaim so a superseded worker cannot publish a late result.
 */
export const aiGradingRequests = pgTable(
  "ai_grading_requests",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    requestId: text("request_id").notNull(),
    kind: text("kind").$type<AiGradingKind>().notNull(),
    scope: text("scope").notNull(),
    inputHash: text("input_hash").notNull(),
    day: text("day").notNull(),
    status: text("status").$type<AiGradingRequestStatus>().notNull(),
    claimId: text("claim_id").notNull(),
    submissionId: text("submission_id"),
    startedAt: ts("started_at").notNull(),
    completedAt: ts("completed_at"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.requestId] }),
    index("ai_grading_requests_user_day_idx").on(t.userId, t.day),
    uniqueIndex("ai_grading_requests_active_scope_idx")
      .on(t.userId, t.scope)
      .where(sql`${t.status} = 'in_progress'`),
    check("ai_grading_requests_kind_check", sql`${t.kind} in ('writing', 'speaking')`),
    check(
      "ai_grading_requests_status_check",
      sql`${t.status} in ('in_progress', 'completed', 'failed')`,
    ),
    check("ai_grading_requests_day_check", sql`${t.day} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`),
    check(
      "ai_grading_requests_lifecycle_check",
      sql`(${t.status} = 'in_progress' and ${t.completedAt} is null and ${t.submissionId} is null) or (${t.status} = 'completed' and ${t.completedAt} is not null and ${t.submissionId} is not null) or (${t.status} = 'failed' and ${t.completedAt} is not null)`,
    ),
  ],
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
    /** Immutable content/key snapshot used for timing, grading, and review. */
    sectionsSnapshot: jsonb("sections_snapshot").$type<SeededExamSection[]>().notNull(),
    answers: jsonb("answers").$type<AnswerMap>().notNull(),
    sectionScores: jsonb("section_scores").$type<SectionScore[] | null>(),
    rawScore: integer("raw_score"),
    totalQuestions: integer("total_questions").notNull(),
    estimate: jsonb("estimate").$type<ExamEstimate | null>(),
    completedAt: ts("completed_at"),
    abandonedAt: ts("abandoned_at"),
  },
  (t) => [
    index("mock_exam_attempts_user_idx").on(t.userId, t.startedAt),
    index("mock_exam_attempts_user_status_idx").on(t.userId, t.status, t.completedAt),
    // At most one live attempt per user+exam: startExamAttempt's
    // check-then-insert would otherwise race under concurrent starts.
    uniqueIndex("mock_exam_attempts_in_progress_idx")
      .on(t.userId, t.examId)
      .where(sql`${t.status} = 'in_progress'`),
    check("mock_exam_attempts_track_check", sql`${t.track} in ('toeic', 'ielts')`),
    check(
      "mock_exam_attempts_status_check",
      sql`${t.status} in ('in_progress', 'completed', 'abandoned')`,
    ),
    check(
      "mock_exam_attempts_progress_check",
      sql`${t.currentSectionIndex} >= 0 and ${t.totalQuestions} > 0 and (${t.rawScore} is null or ${t.rawScore} between 0 and ${t.totalQuestions})`,
    ),
    check(
      "mock_exam_attempts_lifecycle_check",
      sql`(${t.status} = 'in_progress' and ${t.completedAt} is null and ${t.abandonedAt} is null) or (${t.status} = 'completed' and ${t.completedAt} is not null and ${t.abandonedAt} is null) or (${t.status} = 'abandoned' and ${t.abandonedAt} is not null)`,
    ),
  ],
);

/**
 * Durable notebook re-test events. `mistake_states` is the current read model;
 * these rows retain how a learner cleared an item and support rebuilds.
 */
export const mistakeClears = pgTable(
  "mistake_clears",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").$type<MistakeKind>().notNull(),
    refId: text("ref_id").notNull(),
    questionId: text("question_id").notNull(),
    clearedAt: ts("cleared_at").notNull().$defaultFn(now),
  },
  (t) => [
    uniqueIndex("mistake_clears_user_question_idx").on(t.userId, t.kind, t.refId, t.questionId),
    check(
      "mistake_clears_kind_check",
      sql`${t.kind} in ('reading', 'listening', 'vocab_quiz', 'exam')`,
    ),
  ],
);

/**
 * Current mistakes notebook read model. Attempt/retest transactions maintain
 * it from trusted grading outcomes; reads never scan historical attempts.
 */
export const mistakeStates = pgTable(
  "mistake_states",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    track: text("track").$type<Track>().notNull(),
    kind: text("kind").$type<MistakeKind>().notNull(),
    refId: text("ref_id").notNull(),
    questionId: text("question_id").notNull(),
    /** Zero marks a hidden correct-only tombstone for outcome ordering. */
    wrongCount: integer("wrong_count").notNull(),
    lastWrongAt: ts("last_wrong_at"),
    /** Latest resolving real attempt or notebook re-test, if any. */
    clearedAt: ts("cleared_at"),
    updatedAt: ts("updated_at").notNull().$defaultFn(now),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.kind, t.refId, t.questionId] }),
    index("mistake_states_user_track_idx").on(t.userId, t.track, t.lastWrongAt),
    check("mistake_states_track_check", sql`${t.track} in ('toeic', 'ielts', 'business')`),
    check(
      "mistake_states_kind_check",
      sql`${t.kind} in ('reading', 'listening', 'vocab_quiz', 'exam')`,
    ),
    check("mistake_states_wrong_count_check", sql`${t.wrongCount} >= 0`),
    check(
      "mistake_states_lifecycle_check",
      sql`(${t.wrongCount} = 0 and ${t.lastWrongAt} is null and ${t.clearedAt} is not null) or (${t.wrongCount} >= 1 and ${t.lastWrongAt} is not null)`,
    ),
  ],
);

/**
 * Tutor chat: one rolling thread per user (the memory IS the thread — no
 * thread management, see ADR 0013). `day` snapshots the learner's IANA-local
 * calendar day at insert and drives the per-user daily cap.
 */
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<"user" | "assistant">().notNull(),
    content: text("content").notNull(),
    /** AI model for assistant rows; null on user rows. */
    model: text("model"),
    /** Local date string YYYY-MM-DD, same convention as activity_days.day. */
    day: text("day").notNull(),
    /** Per-user monotonic order; timestamps are display metadata only. */
    sequence: integer("sequence").notNull(),
    createdAt: ts("created_at").notNull().$defaultFn(now),
  },
  (t) => [
    index("chat_messages_user_created_idx").on(t.userId, t.createdAt),
    index("chat_messages_user_day_idx").on(t.userId, t.day),
    uniqueIndex("chat_messages_user_sequence_idx").on(t.userId, t.sequence),
    check("chat_messages_role_check", sql`${t.role} in ('user', 'assistant')`),
    check("chat_messages_day_check", sql`${t.day} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`),
    check("chat_messages_sequence_check", sql`${t.sequence} >= 1`),
    check(
      "chat_messages_model_check",
      sql`(${t.role} = 'user' and ${t.model} is null) or ${t.role} = 'assistant'`,
    ),
  ],
);

/** Exact chat quota and single-flight state for one learner's rolling thread. */
export const chatStates = pgTable(
  "chat_states",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Learner-local day represented by usedCount. */
    day: text("day").notNull(),
    usedCount: integer("used_count").notNull().default(0),
    /** Next message sequence; advances by two after a completed turn. */
    nextSequence: integer("next_sequence").notNull().default(1),
    /** Renewable single-flight lease; null when no provider call is running. */
    claimId: text("claim_id"),
    claimStartedAt: ts("claim_started_at"),
  },
  (t) => [
    check("chat_states_day_check", sql`${t.day} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`),
    check("chat_states_counts_check", sql`${t.usedCount} >= 0 and ${t.nextSequence} >= 1`),
    check(
      "chat_states_claim_check",
      sql`(${t.claimId} is null and ${t.claimStartedAt} is null) or (${t.claimId} is not null and ${t.claimStartedAt} is not null)`,
    ),
  ],
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
  (t) => [
    primaryKey({ columns: [t.userId, t.day] }),
    check("activity_days_day_check", sql`${t.day} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`),
  ],
);
