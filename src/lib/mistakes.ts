import { and, eq, inArray, sql } from "drizzle-orm";
import type { SanitizedQuestion, ScriptLine, Track } from "@/content/types";
import { db } from "./db";
import {
  exerciseAttempts,
  listeningExercises,
  mistakeClears,
  mockExamAttempts,
  mockExams,
  readingExercises,
  vocabWords,
} from "./db/schema";
import {
  deriveMistakes,
  sourceKey,
  type AnswerKeyMap,
  type CoreAttempt,
  type MistakeStatus,
} from "./mistakes-core";
import { buildQuizQuestion, type QuizQuestion } from "./vocab-quiz-core";

/**
 * Server assembly for the mistakes notebook: derives the wrong-set from
 * attempt history + live content (mistakes-core) and decorates it into view
 * models. Questions ship sanitized — correctIndex/explanationZh only ever
 * leave the server through the retest actions, after an answer.
 */

export interface McqMistakeVM {
  kind: "reading" | "listening" | "exam";
  refId: string;
  questionId: string;
  sourceTitle: string;
  sourceTitleZh: string;
  question: SanitizedQuestion;
  context: { passage?: string; script?: ScriptLine[] } | null;
  wrongCount: number;
  /** ISO string — crosses the RSC boundary. */
  lastWrongAt: string;
  cleared: boolean;
}

export interface VocabMistakeVM {
  kind: "vocab_quiz";
  wordId: string;
  headword: string;
  translationZh: string;
  /** Fresh regenerated question; null when the track pool is too small (view-only). */
  quiz: QuizQuestion | null;
  wrongCount: number;
  lastWrongAt: string;
  cleared: boolean;
}

export type MistakeVM = McqMistakeVM | VocabMistakeVM;

export interface MistakesPageData {
  active: MistakeVM[];
  cleared: MistakeVM[];
  counts: { active: number; cleared: number };
}

async function deriveStatuses(userId: string, track: Track): Promise<MistakeStatus[]> {
  const [attempts, examAttempts, clears] = await Promise.all([
    db.query.exerciseAttempts.findMany({
      where: and(eq(exerciseAttempts.userId, userId), eq(exerciseAttempts.track, track)),
      columns: { kind: true, refId: true, answers: true, completedAt: true },
    }),
    // Business has no mock exams (ExamTrack excludes it).
    track === "business"
      ? Promise.resolve([])
      : db.query.mockExamAttempts.findMany({
          where: and(
            eq(mockExamAttempts.userId, userId),
            eq(mockExamAttempts.track, track),
            eq(mockExamAttempts.status, "completed"),
          ),
          columns: { examId: true, answers: true, completedAt: true },
        }),
    db.query.mistakeClears.findMany({ where: eq(mistakeClears.userId, userId) }),
  ]);

  const core: CoreAttempt[] = [
    ...attempts.map((a) => ({
      kind: a.kind,
      refId: a.refId,
      completedAt: a.completedAt,
      answers: a.answers,
    })),
    ...examAttempts.map((a) => ({
      kind: "exam" as const,
      refId: a.examId,
      // status === "completed" guarantees completedAt is set.
      completedAt: a.completedAt!,
      answers: a.answers,
    })),
  ];

  const distinctRefIds = (kind: CoreAttempt["kind"]) => [
    ...new Set(core.filter((a) => a.kind === kind).map((a) => a.refId)),
  ];

  const readingIds = distinctRefIds("reading");
  const listeningIds = distinctRefIds("listening");
  const examIds = distinctRefIds("exam");
  const [reading, listening, exams] = await Promise.all([
    readingIds.length
      ? db.query.readingExercises.findMany({ where: inArray(readingExercises.id, readingIds) })
      : Promise.resolve([]),
    listeningIds.length
      ? db.query.listeningExercises.findMany({
          where: inArray(listeningExercises.id, listeningIds),
        })
      : Promise.resolve([]),
    examIds.length
      ? db.query.mockExams.findMany({ where: inArray(mockExams.id, examIds) })
      : Promise.resolve([]),
  ]);

  const answerKeys: AnswerKeyMap = new Map();
  for (const ex of reading) {
    answerKeys.set(
      sourceKey("reading", ex.id),
      new Map(ex.questions.map((q) => [q.id, q.correctIndex])),
    );
  }
  for (const ex of listening) {
    answerKeys.set(
      sourceKey("listening", ex.id),
      new Map(ex.questions.map((q) => [q.id, q.correctIndex])),
    );
  }
  for (const exam of exams) {
    const key = new Map<string, number>();
    for (const section of exam.sections) {
      for (const group of section.groups) {
        for (const q of group.questions) key.set(q.id, q.correctIndex);
      }
    }
    answerKeys.set(sourceKey("exam", exam.id), key);
  }

  return deriveMistakes(core, answerKeys, clears);
}

/** Statuses whose vocab word still exists; other kinds pass through. */
async function withExistingWords(statuses: MistakeStatus[]): Promise<MistakeStatus[]> {
  const wordIds = statuses.filter((s) => s.kind === "vocab_quiz").map((s) => s.questionId);
  if (wordIds.length === 0) return statuses;
  const existing = new Set(
    (
      await db.query.vocabWords.findMany({
        where: inArray(vocabWords.id, wordIds),
        columns: { id: true },
      })
    ).map((w) => w.id),
  );
  return statuses.filter((s) => s.kind !== "vocab_quiz" || existing.has(s.questionId));
}

export async function countActiveMistakes(userId: string, track: Track): Promise<number> {
  const statuses = await withExistingWords(await deriveStatuses(userId, track));
  return statuses.filter((s) => !s.cleared).length;
}

export async function getMistakesPageData(userId: string, track: Track): Promise<MistakesPageData> {
  const statuses = await withExistingWords(await deriveStatuses(userId, track));

  const wordIds = statuses.filter((s) => s.kind === "vocab_quiz").map((s) => s.questionId);
  const mcqRefIds = (kind: "reading" | "listening" | "exam") => [
    ...new Set(statuses.filter((s) => s.kind === kind).map((s) => s.refId)),
  ];
  const readingIds = mcqRefIds("reading");
  const listeningIds = mcqRefIds("listening");
  const examIds = mcqRefIds("exam");

  const hasActiveVocab = statuses.some((s) => s.kind === "vocab_quiz" && !s.cleared);
  const [words, pool, reading, listening, exams] = await Promise.all([
    wordIds.length
      ? db.query.vocabWords.findMany({ where: inArray(vocabWords.id, wordIds) })
      : Promise.resolve([]),
    // Distractor pool for regenerated questions, like the quiz page's fetch.
    hasActiveVocab
      ? db.query.vocabWords.findMany({
          where: eq(vocabWords.track, track),
          orderBy: sql`random()`,
          limit: 40,
        })
      : Promise.resolve([]),
    readingIds.length
      ? db.query.readingExercises.findMany({ where: inArray(readingExercises.id, readingIds) })
      : Promise.resolve([]),
    listeningIds.length
      ? db.query.listeningExercises.findMany({
          where: inArray(listeningExercises.id, listeningIds),
        })
      : Promise.resolve([]),
    examIds.length
      ? db.query.mockExams.findMany({ where: inArray(mockExams.id, examIds) })
      : Promise.resolve([]),
  ]);

  const wordById = new Map(words.map((w) => [w.id, w]));
  const readingById = new Map(reading.map((e) => [e.id, e]));
  const listeningById = new Map(listening.map((e) => [e.id, e]));
  const examById = new Map(exams.map((e) => [e.id, e]));

  const vms: MistakeVM[] = [];
  let vocabIndex = 0;
  for (const status of statuses) {
    const base = {
      wrongCount: status.wrongCount,
      lastWrongAt: status.lastWrongAt.toISOString(),
      cleared: status.cleared,
    };

    if (status.kind === "vocab_quiz") {
      const word = wordById.get(status.questionId);
      if (!word) continue;
      const canQuiz = !status.cleared && pool.length >= 4;
      vms.push({
        ...base,
        kind: "vocab_quiz",
        wordId: word.id,
        headword: word.headword,
        translationZh: word.translationZh,
        quiz: canQuiz
          ? buildQuizQuestion(word, pool, vocabIndex++ % 2 === 0 ? "en2zh" : "zh2en")
          : null,
      });
      continue;
    }

    if (status.kind === "exam") {
      const exam = examById.get(status.refId);
      if (!exam) continue;
      for (const section of exam.sections) {
        for (const group of section.groups) {
          const q = group.questions.find((question) => question.id === status.questionId);
          if (!q) continue;
          vms.push({
            ...base,
            kind: "exam",
            refId: exam.id,
            questionId: q.id,
            sourceTitle: exam.title,
            sourceTitleZh: exam.titleZh,
            question: { id: q.id, stem: q.stem, options: q.options },
            context:
              group.passage || group.script
                ? { passage: group.passage, script: group.script }
                : null,
          });
        }
      }
      continue;
    }

    const exercise =
      status.kind === "reading" ? readingById.get(status.refId) : listeningById.get(status.refId);
    if (!exercise) continue;
    const q = exercise.questions.find((question) => question.id === status.questionId);
    if (!q) continue;
    vms.push({
      ...base,
      kind: status.kind,
      refId: exercise.id,
      questionId: q.id,
      sourceTitle: exercise.title,
      sourceTitleZh: exercise.titleZh,
      question: { id: q.id, stem: q.stem, options: q.options },
      context: "passage" in exercise ? { passage: exercise.passage } : { script: exercise.script },
    });
  }

  const active = vms.filter((vm) => !vm.cleared);
  const cleared = vms.filter((vm) => vm.cleared);
  return { active, cleared, counts: { active: active.length, cleared: cleared.length } };
}
