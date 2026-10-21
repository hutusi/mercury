import type { Bilingual } from "@/content/types";
import { Callout } from "@/components/ui/callout";
import { getDict } from "@/lib/i18n";

/**
 * No AI feedback (keyless, a failed call, or the daily quota): say why, offer
 * the retry when it can help, and turn the page into a self-check — the
 * checklist to tick through and the model answer to compare against.
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
      <Callout variant="accent" className="px-5 py-4 text-sm">
        <p className="font-semibold">
          {title ?? (canRetry ? t.writing.aiUnavailableTitle : t.writing.selfAssessTitle)}
        </p>
        <p className="mt-1 leading-relaxed text-soft-3">
          {hint ?? (canRetry ? t.writing.aiUnavailableHint : t.writing.selfAssessHint)}
        </p>
        {retry ? <div className="mt-3">{retry}</div> : null}
      </Callout>

      <section aria-labelledby="self-checklist">
        <h2 id="self-checklist" className="text-[0.9375rem] font-semibold">
          {t.writing.checklist}
        </h2>
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {checklist.map((item, i) => (
            <li key={i}>
              <label
                htmlFor={`check-${i}`}
                className="flex cursor-pointer items-start gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-accent"
              >
                <input
                  type="checkbox"
                  id={`check-${i}`}
                  className="mt-0.5 size-[1.125rem] shrink-0 rounded-sm accent-brand"
                />
                <span>
                  <span className="font-medium">{item.zh}</span>
                  <span className="mt-0.5 block text-muted-foreground">{item.en}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="self-model">
        <h2 id="self-model" className="text-[0.9375rem] font-semibold">
          {t.writing.modelAnswer}
        </h2>
        <p className="mt-3 rounded-lg bg-muted px-5 py-4 font-serif text-base leading-[1.75] whitespace-pre-line">
          {modelAnswer}
        </p>
      </section>
    </div>
  );
}
