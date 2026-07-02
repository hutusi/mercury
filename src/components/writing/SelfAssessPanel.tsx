import { SectionLabel } from "@/components/typography/SectionLabel";
import type { Bilingual } from "@/content/types";
import { getDict } from "@/lib/i18n";

export async function SelfAssessPanel({
  modelAnswer,
  checklist,
}: {
  modelAnswer: string;
  checklist: Bilingual[];
}) {
  const t = await getDict();

  return (
    <div className="space-y-6">
      <div className="border border-cinnabar/30 bg-cinnabar/5 p-4 text-sm">
        <p className="font-medium">{t.writing.selfAssessTitle}</p>
        <p className="mt-1 text-muted-foreground">{t.writing.selfAssessHint}</p>
      </div>

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
