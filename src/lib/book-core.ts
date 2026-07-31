import type { BookSection, CefrLevel, McqQuestion, SanitizedQuestion } from "../content/types";
import type { SelfRatedLevel } from "./learner-model-core";

/**
 * Pure logic for book reading (ADR 0024): sanitization, check-in lookup,
 * quiz grading, and chapter lock derivation. DB-free so it is unit-testable
 * under Bun — services and queries assemble the inputs.
 */

export interface SanitizedBookSection {
  id: string;
  text: string;
  checkIn?: SanitizedQuestion;
}

/** Whitelist rebuild: neither question group ever ships answers or explanations. */
export function sanitizeChapter(chapter: { sections: BookSection[]; quiz: McqQuestion[] }): {
  sections: SanitizedBookSection[];
  quiz: SanitizedQuestion[];
} {
  return {
    sections: chapter.sections.map((section) => ({
      id: section.id,
      text: section.text,
      ...(section.checkIn
        ? {
            checkIn: {
              id: section.checkIn.id,
              stem: section.checkIn.stem,
              options: section.checkIn.options,
            },
          }
        : {}),
    })),
    quiz: chapter.quiz.map(({ id, stem, options }) => ({ id, stem, options })),
  };
}

/**
 * Locate a check-in by question id — check-ins ONLY. A quiz question id
 * returns null by design, so the check-in reveal can never be used as an
 * answer oracle for the end-of-chapter quiz.
 */
export function findCheckIn(sections: BookSection[], questionId: string): McqQuestion | null {
  for (const section of sections) {
    if (section.checkIn?.id === questionId) return section.checkIn;
  }
  return null;
}

export interface GradedBookQuiz {
  score: number;
  total: number;
  perQuestion: {
    questionId: string;
    correctIndex: number;
    explanationZh: string;
    correct: boolean;
  }[];
}

/** Iterates the quiz key — a missing answer counts as wrong, like exams. */
export function gradeBookQuiz(
  quiz: McqQuestion[],
  answers: Record<string, number>,
): GradedBookQuiz {
  const perQuestion = quiz.map((q) => ({
    questionId: q.id,
    correctIndex: q.correctIndex,
    explanationZh: q.explanationZh,
    correct: answers[q.id] === q.correctIndex,
  }));
  return {
    score: perQuestion.filter((p) => p.correct).length,
    total: perQuestion.length,
    perQuestion,
  };
}

export interface ChapterState {
  chapterId: string;
  sortOrder: number;
  completed: boolean;
  locked: boolean;
}

/**
 * Sequential hard lock, completion-gated (ADR 0024): a chapter is locked
 * until the previous chapter's quiz has been submitted (any score). Chapter
 * 1 is always unlocked. Input order does not matter; output is sorted.
 */
export function deriveChapterStates(
  chapters: { id: string; sortOrder: number }[],
  completedChapterIds: ReadonlySet<string>,
): ChapterState[] {
  const sorted = [...chapters].sort((a, b) => a.sortOrder - b.sortOrder);
  const states: ChapterState[] = [];
  for (const [i, chapter] of sorted.entries()) {
    const previous = i > 0 ? states[i - 1] : null;
    states.push({
      chapterId: chapter.id,
      sortOrder: chapter.sortOrder,
      completed: completedChapterIds.has(chapter.id),
      locked: previous !== null && !previous.completed,
    });
  }
  return states;
}

/** The chapter to continue with: the first unlocked, not-yet-completed one. */
export function currentChapterId(states: ChapterState[]): string | null {
  for (const state of states) {
    if (!state.completed && !state.locked) return state.chapterId;
  }
  return null;
}

/** Reading time at a learner's pace plus quiz time, clamped to a sane range. */
export function estimateChapterMinutes(wordCount: number, quizCount: number): number {
  const minutes = Math.ceil(wordCount / 180) + Math.ceil(quizCount * 0.5);
  return Math.min(30, Math.max(5, minutes));
}

/**
 * Ladder guidance, never gates: the CEFR band(s) where a learner should
 * start reading, from their onboarding self-rating. Unrated learners get no
 * recommendation rather than a guess. A recommended band with no books in
 * the library simply renders no hint (advanced → C1 stays empty until a C1
 * title ships).
 */
export function recommendedBands(level: SelfRatedLevel | null): CefrLevel[] {
  switch (level) {
    case "novice":
    case "elementary":
      return ["B1"];
    case "intermediate":
      return ["B1", "B2"];
    case "upper":
      return ["B2"];
    case "advanced":
      return ["C1"];
    default:
      return [];
  }
}

/**
 * Group a ladder-ordered book list by CEFR band, preserving input order —
 * first occurrence of a band opens its group, so the caller's ordering
 * (books.sortOrder) stays authoritative.
 */
export function groupBooksByBand<T extends { cefrLevel: CefrLevel }>(
  list: T[],
): { band: CefrLevel; books: T[] }[] {
  const groups: { band: CefrLevel; books: T[] }[] = [];
  const byBand = new Map<CefrLevel, T[]>();
  for (const book of list) {
    let group = byBand.get(book.cefrLevel);
    if (!group) {
      group = [];
      byBand.set(book.cefrLevel, group);
      groups.push({ band: book.cefrLevel, books: group });
    }
    group.push(book);
  }
  return groups;
}
