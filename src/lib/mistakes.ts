import { and, count, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { cache } from "react";
import type { SanitizedQuestion, ScriptLine, Track } from "@/content/types";
import { db } from "./db";
import {
  listeningExercises,
  mistakeStates,
  mockExams,
  readingExercises,
  vocabWords,
} from "./db/schema";
import type { MistakeStatus } from "./mistakes-core";

/**
 * Server assembly for the mistakes notebook: reads the bounded current-state
 * model and decorates it with live content. Questions ship sanitized — answer
 * keys only leave through a retest result after the learner answers.
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

async function listStatuses(userId: string, track: Track): Promise<MistakeStatus[]> {
  const rows = await db.query.mistakeStates.findMany({
    where: and(
      eq(mistakeStates.userId, userId),
      eq(mistakeStates.track, track),
      gt(mistakeStates.wrongCount, 0),
    ),
    orderBy: desc(mistakeStates.lastWrongAt),
  });
  return rows.map((row) => {
    if (!row.lastWrongAt) throw new Error("Persisted mistake is missing its wrong timestamp");
    return {
      kind: row.kind,
      refId: row.refId,
      questionId: row.questionId,
      wrongCount: row.wrongCount,
      lastWrongAt: row.lastWrongAt,
      cleared: row.clearedAt !== null && row.clearedAt.getTime() >= row.lastWrongAt.getTime(),
    };
  });
}

// cache(): the dashboard and the daily plan both count active mistakes in the
// same render — dedupe it to one query per request.
export const countActiveMistakes = cache(async (userId: string, track: Track): Promise<number> => {
  const [row] = await db
    .select({ value: count() })
    .from(mistakeStates)
    .where(
      and(
        eq(mistakeStates.userId, userId),
        eq(mistakeStates.track, track),
        gt(mistakeStates.wrongCount, 0),
        or(isNull(mistakeStates.clearedAt), gt(mistakeStates.lastWrongAt, mistakeStates.clearedAt)),
      ),
    );
  return row?.value ?? 0;
});

export async function getMistakesPageData(userId: string, track: Track): Promise<MistakesPageData> {
  const statuses = await listStatuses(userId, track);

  const wordIds = statuses.filter((s) => s.kind === "vocab_quiz").map((s) => s.questionId);
  const mcqRefIds = (kind: "reading" | "listening" | "exam") => [
    ...new Set(statuses.filter((s) => s.kind === kind).map((s) => s.refId)),
  ];
  const readingIds = mcqRefIds("reading");
  const listeningIds = mcqRefIds("listening");
  const examIds = mcqRefIds("exam");

  const [words, reading, listening, exams] = await Promise.all([
    wordIds.length
      ? db.query.vocabWords.findMany({ where: inArray(vocabWords.id, wordIds) })
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
  for (const status of statuses) {
    const base = {
      wrongCount: status.wrongCount,
      lastWrongAt: status.lastWrongAt.toISOString(),
      cleared: status.cleared,
    };

    if (status.kind === "vocab_quiz") {
      const word = wordById.get(status.questionId);
      if (!word) continue;
      vms.push({
        ...base,
        kind: "vocab_quiz",
        wordId: word.id,
        headword: word.headword,
        translationZh: word.translationZh,
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
