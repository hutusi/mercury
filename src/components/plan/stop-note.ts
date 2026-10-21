import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fill } from "@/lib/i18n/fill";
import type { PlanStop } from "@/lib/plan-status-core";
import { planReason } from "./plan-labels";

/**
 * The second line under a stop: what's done so far (2 / 5 words, 2 of 3
 * correct, part 2 of 3), a skipped note, or — untouched — why the tutor
 * planned it.
 */
export function stopNote(t: Dictionary, stop: PlanStop): string {
  if (stop.status === "skipped") return t.today.skipped;
  const p = stop.progress;
  if (p?.type === "count" && (p.done > 0 || stop.status === "done")) {
    const template =
      stop.kind === "vocab_review"
        ? t.today.noteVocab
        : stop.kind === "vocab_new"
          ? t.today.noteNew
          : t.today.noteMistakes;
    return fill(template, { d: p.done, n: p.target });
  }
  if (p?.type === "score") return fill(t.today.noteScore, { s: p.score, n: p.total });
  if (p?.type === "exam") return fill(t.today.noteExam, { i: p.section, n: p.sections });
  if (stop.status === "done") return t.today.noteDone;
  return planReason(t, stop.reasonKey);
}
