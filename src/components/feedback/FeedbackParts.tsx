import type { Bilingual } from "@/content/types";
import { Callout } from "@/components/ui/callout";

/*
 * Presentational pieces shared by writing and speaking feedback. No hooks and
 * no dictionary access — labels come in as props — so server panels and the
 * client speaking runner render the same markup.
 */

/** The score at a glance, with what it means. */
export function ScoreHero({
  label,
  score,
  summary,
}: {
  label: string;
  score: string;
  summary: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-raised">
      <p className="text-[0.8125rem] text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-4xl font-medium tabular-nums">{score}</p>
      <p className="mt-3 text-sm leading-[1.75] text-pretty text-soft-3">{summary}</p>
    </section>
  );
}

/** A titled feedback block. */
export function FeedbackSection({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="flex items-center gap-2 text-[0.9375rem] font-semibold">
        {icon}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Why there's no AI feedback, and the retry when one can help. */
export function SelfAssessNotice({
  title,
  hint,
  retry,
}: {
  title: string;
  hint: string;
  retry?: React.ReactNode;
}) {
  return (
    <Callout variant="accent" className="px-5 py-4 text-sm">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 leading-relaxed text-soft-3">{hint}</p>
      {retry ? <div className="mt-3 flex flex-col items-start gap-3">{retry}</div> : null}
    </Callout>
  );
}

/** The self-check: a checklist to tick through and the model answer to compare. */
export function SelfCheck({
  idPrefix,
  checklist,
  checklistLabel,
  modelAnswer,
  modelAnswerLabel,
}: {
  idPrefix: string;
  checklist: Bilingual[];
  checklistLabel: string;
  modelAnswer: string;
  modelAnswerLabel: string;
}) {
  return (
    <>
      <FeedbackSection id={`${idPrefix}-checklist`} title={checklistLabel}>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {checklist.map((item, i) => (
            <li key={i}>
              <label
                htmlFor={`${idPrefix}-check-${i}`}
                className="flex cursor-pointer items-start gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-accent"
              >
                <input
                  type="checkbox"
                  id={`${idPrefix}-check-${i}`}
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
      </FeedbackSection>
      <FeedbackSection id={`${idPrefix}-model`} title={modelAnswerLabel}>
        <p className="rounded-lg bg-muted px-5 py-4 font-serif text-base leading-[1.75] whitespace-pre-line">
          {modelAnswer}
        </p>
      </FeedbackSection>
    </>
  );
}

/** The learner's own words as a struck-through mistake, then the better version. */
export function FixCard({
  original,
  improved,
  note,
}: {
  original: string;
  improved: React.ReactNode;
  note: string;
}) {
  return (
    <li className="rounded-lg border border-border bg-card px-4 py-3.5 text-sm">
      <p className="font-serif text-[0.9375rem] text-coral-ink line-through decoration-coral">
        “{original}”
      </p>
      <p className="mt-1.5 leading-relaxed text-soft-3">{note}</p>
      <p className="mt-2 leading-relaxed font-medium text-brand-ink">{improved}</p>
    </li>
  );
}
