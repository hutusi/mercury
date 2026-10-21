"use client";

import { useCallback } from "react";
import type { SanitizedQuestion } from "@/content/types";
import { DAY_MS, isAnswerMap, type DraftKind } from "@/lib/drafts";
import { useDraft } from "@/lib/use-draft";

const isEmptyAnswers = (answers: Record<string, number>) => Object.keys(answers).length === 0;

/**
 * Picked-but-unsubmitted MCQ answers survive a reload for the rest of the
 * browser session (sessionStorage: a stale half-answered set should not greet
 * the learner days later). Only answers to questions still on the page are
 * restored, so a content edit can't smuggle stale ids into a submit.
 */
export function useAnswerDraft({
  kind,
  id,
  questions,
  answers,
  enabled,
  onRestore,
}: {
  kind: Extract<DraftKind, "reading" | "listening" | "book_quiz">;
  id: string;
  questions: readonly SanitizedQuestion[];
  answers: Record<string, number>;
  enabled: boolean;
  onRestore: (answers: Record<string, number>) => void;
}): { clear: () => void } {
  const restore = useCallback(
    (saved: Record<string, number>) => {
      const known = new Set(questions.map((q) => q.id));
      const kept = Object.fromEntries(Object.entries(saved).filter(([qid]) => known.has(qid)));
      if (!isEmptyAnswers(kept)) onRestore(kept);
    },
    [questions, onRestore],
  );
  return useDraft({
    kind,
    id,
    value: answers,
    enabled,
    area: "session",
    maxAgeMs: DAY_MS,
    validate: isAnswerMap,
    isEmpty: isEmptyAnswers,
    onRestore: restore,
  });
}
