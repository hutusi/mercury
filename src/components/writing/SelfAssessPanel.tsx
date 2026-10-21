import { SelfAssessNotice, SelfCheck } from "@/components/feedback/FeedbackParts";
import type { Bilingual } from "@/content/types";
import { getDict } from "@/lib/i18n";

/**
 * No AI feedback (keyless, a failed call, or the daily quota): say why, offer
 * the retry when it can help, and turn the page into a self-check.
 */
export async function SelfAssessPanel({
  modelAnswer,
  checklist,
  canRetry = false,
  retry,
  title,
  hint,
}: {
  modelAnswer: string;
  checklist: Bilingual[];
  /** True when a key is configured, so the earlier failure was transient. */
  canRetry?: boolean;
  retry?: React.ReactNode;
  /** Override the notice (e.g. quota exhaustion instead of AI failure). */
  title?: string;
  hint?: string;
}) {
  const t = await getDict();
  return (
    <div className="flex flex-col gap-8">
      <SelfAssessNotice
        title={title ?? (canRetry ? t.writing.aiUnavailableTitle : t.writing.selfAssessTitle)}
        hint={hint ?? (canRetry ? t.writing.aiUnavailableHint : t.writing.selfAssessHint)}
        retry={retry}
      />
      <SelfCheck
        idPrefix="writing"
        checklist={checklist}
        checklistLabel={t.writing.checklist}
        modelAnswer={modelAnswer}
        modelAnswerLabel={t.writing.modelAnswer}
      />
    </div>
  );
}
