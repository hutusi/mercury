import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { PlanItemKind, PlanReasonKey } from "@/lib/plan-core";

/** Display title for a plan stop kind (client- and server-safe). */
export function planItemTitle(t: Dictionary, kind: PlanItemKind): string {
  const titles: Record<PlanItemKind, string> = {
    vocab_review: t.plan.itemVocabReview,
    vocab_new: t.plan.itemVocabNew,
    mistakes: t.plan.itemMistakes,
    book_chapter: t.plan.itemBookChapter,
    reading: t.plan.itemReading,
    listening: t.plan.itemListening,
    writing: t.plan.itemWriting,
    speaking: t.plan.itemSpeaking,
    mock_exam: t.plan.itemMockExam,
  };
  return titles[kind];
}

/** Why the tutor put a stop in today's plan. */
export function planReason(t: Dictionary, key: PlanReasonKey): string {
  const reasons: Record<PlanReasonKey, string> = {
    dueVocab: t.plan.reasonDueVocab,
    newWords: t.plan.reasonNewWords,
    clearMistakes: t.plan.reasonClearMistakes,
    continueBook: t.plan.reasonContinueBook,
    weakSkill: t.plan.reasonWeakSkill,
    writingCadence: t.plan.reasonWritingCadence,
    speakingCadence: t.plan.reasonSpeakingCadence,
    examCheckpoint: t.plan.reasonExamCheckpoint,
  };
  return reasons[key];
}
