import { FlowBody } from "@/components/flow/FlowBody";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { getFlowContext } from "@/lib/queries/plan";
import { notFound } from "next/navigation";
import { EntryList, EntryRow } from "@/components/typography/EntryList";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Badge } from "@/components/ui/badge";
import { WritingEditor } from "@/components/writing/WritingEditor";
import { formatLearnerDate } from "@/lib/format-date";
import { requireOnboarded } from "@/lib/settings";
import { getDict, getLocale } from "@/lib/i18n";
import { fill } from "@/lib/i18n/fill";
import { getWritingPromptWithHistory } from "@/lib/queries/writing";

// Makes a runtime AI call (directly or via server actions): the provider
// budget plus claim/publish headroom, inside the lease stale window
// (src/lib/ai/budget.ts).
export const maxDuration = 115;

export default async function WritingPromptPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  const [{ user, timeZone }, { promptId }] = await Promise.all([requireOnboarded(), params]);
  // One wave: none of these depend on each other once the user is known.
  const [flow, t, locale, data] = await Promise.all([
    getFlowContext(user.id, timeZone, "writing", promptId),
    getDict(),
    getLocale(),
    getWritingPromptWithHistory(user.id, promptId),
  ]);
  if (!data) notFound();
  const { prompt, past } = data;

  return (
    <>
      <FlowHeader context={flow} hubHref="/writing" />
      <FlowBody>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{t.writingTasks[prompt.taskType]}</Badge>
          <span className="text-[0.8125rem] text-muted-foreground">
            {fill(t.writing.meta, { n: prompt.minWords, m: prompt.suggestedMinutes })}
          </span>
        </div>
        <h1 className="mt-4 font-serif text-[1.75rem] leading-tight font-medium text-balance sm:text-4xl">
          {prompt.title}
        </h1>
        <p className="mt-2 font-serif text-base text-muted-foreground">{prompt.titleZh}</p>

        <section aria-labelledby="writing-task" className="mt-6 rounded-xl bg-muted px-5 py-4">
          <h2 id="writing-task" className="text-[0.8125rem] font-semibold">
            {t.writing.promptLabel}
          </h2>
          <p className="mt-2 font-serif text-[1.0625rem] leading-[1.7] whitespace-pre-line">
            {prompt.promptEn}
          </p>
          <p className="mt-3 border-t border-border pt-3 text-sm leading-relaxed whitespace-pre-line text-soft-3">
            {prompt.promptZh}
          </p>
        </section>

        <div className="mt-6">
          <WritingEditor promptId={prompt.id} minWords={prompt.minWords} />
        </div>

        {past.length > 0 ? (
          <section className="mt-10">
            <SectionLabel as="h2">{t.writing.pastSubmissions}</SectionLabel>
            <EntryList className="mt-3">
              {past.map((s) => (
                <EntryRow
                  key={s.id}
                  href={`/writing/submissions/${s.id}`}
                  title={formatLearnerDate(s.createdAt, locale, timeZone, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  subtitle={`${s.wordCount} ${t.common.words}`}
                  right={
                    s.status === "ai_scored" && s.feedback ? (
                      <span className="font-medium text-brand-ink tabular-nums">
                        {s.feedback.scoreLabel}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t.writing.selfAssessTitle}</span>
                    )
                  }
                />
              ))}
            </EntryList>
          </section>
        ) : null}
      </FlowBody>
    </>
  );
}
