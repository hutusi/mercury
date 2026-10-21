import { SelfAssessNotice, SelfCheck } from "@/components/feedback/FeedbackParts";
import type { Bilingual } from "@/content/types";
import { getDict } from "@/lib/i18n";

/** A saved speaking submission without AI feedback: the reason, the retry, the self-check. */
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
        title={title ?? (canRetry ? t.speaking.aiUnavailableTitle : t.speaking.selfAssessTitle)}
        hint={hint ?? (canRetry ? t.speaking.aiUnavailableHint : t.speaking.selfAssessHint)}
        retry={retry}
      />
      <SelfCheck
        idPrefix="speak"
        checklist={checklist}
        checklistLabel={t.speaking.checklist}
        modelAnswer={modelAnswer}
        modelAnswerLabel={t.speaking.modelAnswer}
      />
    </div>
  );
}
