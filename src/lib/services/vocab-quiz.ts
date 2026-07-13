import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { TrackSchema, type Track } from "../../content/types";
import { db } from "../db";
import {
  exerciseAttempts,
  mistakeClears,
  mistakeStates,
  vocabQuizSessions,
  vocabWords,
  type QuizSessionAnswers,
} from "../db/schema";
import { recordActivityWith } from "../streak";
import {
  buildQuizQuestion,
  gradeQuizAnswer,
  sanitizeQuizQuestion,
  type QuizQuestion,
  type StoredQuizQuestion,
} from "../vocab-quiz-core";
import { ConflictError, ExpiredError, IntegrityError, NotFoundError } from "./errors";
import { clearMistakeGeneration, recordMistakeOutcomes } from "./mistake-state";
import { recordSkillSignalSafely } from "./profile";

const QUIZ_SIZE = 10;
const SESSION_TTL_MS = 30 * 60 * 1000;

export interface QuizSessionResource {
  sessionId: string | null;
  track: Track;
  expiresAt: Date | null;
  questions: QuizQuestion[];
}

export interface QuizAnswerResult {
  correct: boolean;
  correctOptionId: string;
  completed: boolean;
  score?: number;
  total?: number;
}

function resource(session: typeof vocabQuizSessions.$inferSelect): QuizSessionResource {
  return {
    sessionId: session.id,
    track: session.track,
    expiresAt: session.expiresAt,
    questions: session.questions.map(sanitizeQuizQuestion),
  };
}

async function insertSession(input: {
  userId: string;
  track: Track;
  purpose: "practice" | "mistake_retest";
  sourceWordId?: string;
  sourceMistakeAt?: Date;
  questions: StoredQuizQuestion[];
}): Promise<QuizSessionResource> {
  const [session] = await db
    .insert(vocabQuizSessions)
    .values({
      ...input,
      sourceWordId: input.sourceWordId ?? null,
      sourceMistakeAt: input.sourceMistakeAt ?? null,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    })
    .returning();
  return resource(session);
}

/** Create a random practice quiz whose answer key remains server-owned. */
export async function createQuizSessionForUser(
  userId: string,
  trackInput: unknown,
): Promise<QuizSessionResource> {
  const track = TrackSchema.parse(trackInput);
  const words = await db.query.vocabWords.findMany({
    where: eq(vocabWords.track, track),
    orderBy: sql`random()`,
    limit: QUIZ_SIZE + 15,
  });
  if (words.length < 2) return { sessionId: null, track, expiresAt: null, questions: [] };

  const questions = words
    .slice(0, QUIZ_SIZE)
    .map((word, index) => buildQuizQuestion(word, words, index % 2 === 0 ? "en2zh" : "zh2en"))
    .filter((question) => question.options.length >= 2);
  if (!questions.length) return { sessionId: null, track, expiresAt: null, questions: [] };
  return insertSession({ userId, track, purpose: "practice", questions });
}

async function activeVocabMistakeGeneration(userId: string, track: Track, wordId: string) {
  const refId = `quiz-${track}`;
  const row = await db.query.mistakeStates.findFirst({
    where: and(
      eq(mistakeStates.userId, userId),
      eq(mistakeStates.kind, "vocab_quiz"),
      eq(mistakeStates.refId, refId),
      eq(mistakeStates.questionId, wordId),
      gt(mistakeStates.wrongCount, 0),
      or(isNull(mistakeStates.clearedAt), gt(mistakeStates.lastWrongAt, mistakeStates.clearedAt)),
    ),
    columns: { lastWrongAt: true },
  });
  return row?.lastWrongAt ?? null;
}

/** Create a one-question session only for a currently active vocab mistake. */
export async function createVocabMistakeSessionForUser(
  userId: string,
  wordIdInput: unknown,
): Promise<QuizSessionResource> {
  const wordId = z.string().min(1).parse(wordIdInput);
  const word = await db.query.vocabWords.findFirst({ where: eq(vocabWords.id, wordId) });
  if (!word) throw new NotFoundError(`Unknown vocab word: ${wordId}`);
  const sourceMistakeAt = await activeVocabMistakeGeneration(userId, word.track, word.id);
  if (!sourceMistakeAt) {
    throw new IntegrityError(`Not an active mistake: vocab_quiz/quiz-${word.track}/${word.id}`);
  }

  const pool = await db.query.vocabWords.findMany({
    where: eq(vocabWords.track, word.track),
    orderBy: sql`random()`,
    limit: 40,
  });
  if (pool.length < 2) {
    return { sessionId: null, track: word.track, expiresAt: null, questions: [] };
  }
  const question = buildQuizQuestion(word, pool, "en2zh");
  if (question.options.length < 2) {
    return { sessionId: null, track: word.track, expiresAt: null, questions: [] };
  }
  return insertSession({
    userId,
    track: word.track,
    purpose: "mistake_retest",
    sourceWordId: word.id,
    sourceMistakeAt,
    questions: [question],
  });
}

export const QuizAnswerSchema = z.object({
  sessionId: z.string().min(1),
  questionId: z.string().min(1),
  optionId: z.string().min(1),
});

function resultFor(
  questions: StoredQuizQuestion[],
  answers: QuizSessionAnswers,
  questionId: string,
): QuizAnswerResult {
  const question = questions.find((item) => item.id === questionId);
  const optionId = answers[questionId];
  if (!question || !optionId) throw new IntegrityError("Unknown quiz question");
  const graded = gradeQuizAnswer(question, optionId);
  if (!graded) throw new IntegrityError("Unknown quiz option");
  const completed = Object.keys(answers).length === questions.length;
  if (!completed) return { ...graded, completed: false };
  const score = questions.filter((item) => {
    const answer = answers[item.id];
    return answer ? gradeQuizAnswer(item, answer)?.correct : false;
  }).length;
  return { ...graded, completed: true, score, total: questions.length };
}

/**
 * Grade one opaque option under a session-row lock. Repeating the same answer
 * is idempotent; changing an answered question is an explicit 409 conflict.
 */
export async function answerQuizSessionForUser(
  userId: string,
  input: unknown,
): Promise<QuizAnswerResult> {
  const { sessionId, questionId, optionId } = QuizAnswerSchema.parse(input);

  const persisted = await db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(vocabQuizSessions)
      .where(and(eq(vocabQuizSessions.id, sessionId), eq(vocabQuizSessions.userId, userId)))
      .for("update")
      .limit(1);
    if (!session) throw new NotFoundError("Quiz session not found");

    const existing = session.answers[questionId];
    if (existing) {
      if (existing !== optionId) {
        throw new ConflictError("Question was already answered", "quiz_answer_conflict");
      }
      return { result: resultFor(session.questions, session.answers, questionId), signal: null };
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new ExpiredError("Quiz session expired", "quiz_session_expired");
    }

    const question = session.questions.find((item) => item.id === questionId);
    if (!question || !question.options.some((option) => option.id === optionId)) {
      throw new IntegrityError("Unknown quiz question or option");
    }

    const answers = { ...session.answers, [questionId]: optionId };
    const result = resultFor(session.questions, answers, questionId);
    await tx
      .update(vocabQuizSessions)
      .set({ answers, consumedAt: result.completed ? new Date() : null })
      .where(eq(vocabQuizSessions.id, session.id));

    let signal: number | null = null;
    if (result.completed && session.purpose === "practice") {
      const completedAt = new Date();
      const answerMap: Record<string, number> = {};
      for (const item of session.questions) {
        const answer = answers[item.id];
        answerMap[item.wordId] = answer && gradeQuizAnswer(item, answer)?.correct ? 1 : 0;
      }
      await tx.insert(exerciseAttempts).values({
        userId,
        kind: "vocab_quiz",
        refId: `quiz-${session.track}`,
        track: session.track,
        answers: answerMap,
        score: result.score ?? 0,
        total: result.total ?? session.questions.length,
        durationSeconds: 0,
        completedAt,
      });
      await recordMistakeOutcomes(tx, {
        userId,
        track: session.track,
        kind: "vocab_quiz",
        refId: `quiz-${session.track}`,
        occurredAt: completedAt,
        outcomes: session.questions.map((item) => ({
          questionId: item.wordId,
          correct: answerMap[item.wordId] === 1,
        })),
      });
      signal = session.questions.length
        ? ((result.score ?? 0) / session.questions.length) * 100
        : 0;
    }

    if (result.completed && session.purpose === "mistake_retest" && result.correct) {
      if (!session.sourceWordId || !session.sourceMistakeAt) {
        throw new IntegrityError("Mistake session is missing its source generation");
      }
      const clearedAt = new Date();
      const cleared = await clearMistakeGeneration(tx, {
        userId,
        track: session.track,
        kind: "vocab_quiz",
        refId: `quiz-${session.track}`,
        questionId: session.sourceWordId,
        expectedLastWrongAt: session.sourceMistakeAt,
        clearedAt,
      });
      if (!cleared) {
        // Throwing inside the transaction also rolls back the accepted answer,
        // so every replay of this stale session receives the same 410.
        throw new ExpiredError(
          "The mistake changed after this re-test was created",
          "mistake_session_stale",
        );
      }
      await tx
        .insert(mistakeClears)
        .values({
          userId,
          kind: "vocab_quiz",
          refId: `quiz-${session.track}`,
          questionId: session.sourceWordId,
          clearedAt,
        })
        .onConflictDoUpdate({
          target: [
            mistakeClears.userId,
            mistakeClears.kind,
            mistakeClears.refId,
            mistakeClears.questionId,
          ],
          set: {
            clearedAt: sql`greatest(${mistakeClears.clearedAt}, ${clearedAt})`,
          },
        });
    }

    if (result.completed) await recordActivityWith(tx, userId);
    return { result, signal };
  });

  if (persisted.signal !== null) {
    await recordSkillSignalSafely(userId, {
      skill: "vocab",
      value: persisted.signal,
      source: "exercise",
    });
  }
  return persisted.result;
}
