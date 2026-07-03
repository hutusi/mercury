import { SectionLabel } from "@/components/typography/SectionLabel";
import { Callout } from "@/components/ui/callout";
import type { Bilingual } from "@/content/types";
import { getDict } from "@/lib/i18n";

export async function SelfAssessPanel({
  modelAnswer,
  checklist,
  canRetry = false,
  retry,
}: {
  modelAnswer: string;
  checklist: Bilingual[];
  /** True when a key is configured, so the earlier failure was transient. */
  canRetry?: boolean;
  retry?: React.ReactNode;
}) {
  const t = await getDict();

  return (
    <div className="space-y-6">
      <Callout variant="accent" className="p-4 text-sm">
        <p className="font-medium">
          {canRetry ? t.writing.aiUnavailableTitle : t.writing.selfAssessTitle}
        </p>
        <p className="mt-1 text-muted-foreground">
          {canRetry ? t.writing.aiUnavailableHint : t.writing.selfAssessHint}
        </p>
        {retry ? <div className="mt-3">{retry}</div> : null}
      </Callout>

      <section className="border-y border-border py-6">
        <SectionLabel as="h2" className="mb-3">
          {t.writing.checklist}
        </SectionLabel>
        <ul className="space-y-3">
          {checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                id={`check-${i}`}
                className="mt-0.5 h-4 w-4 rounded-sm border-border accent-cinnabar"
              />
              <label htmlFor={`check-${i}`} className="cursor-pointer">
                <span className="font-medium">{item.zh}</span>
                <span className="block text-muted-foreground">{item.en}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-border py-6">
        <SectionLabel as="h2" className="mb-3">
          {t.writing.modelAnswer}
        </SectionLabel>
        <p className="font-serif text-sm leading-relaxed whitespace-pre-line text-foreground/80">
          {modelAnswer}
        </p>
      </section>
    </div>
  );
}
