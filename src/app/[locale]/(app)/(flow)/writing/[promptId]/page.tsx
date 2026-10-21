import { FlowBody } from "@/components/flow/FlowBody";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { getFlowContext } from "@/lib/queries/plan";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { WritingEditor } from "@/components/writing/WritingEditor";
import { formatLearnerDate } from "@/lib/format-date";
import { requireOnboarded } from "@/lib/settings";
import { getDict, getLocale } from "@/lib/i18n";
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
        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-3xl font-medium tracking-tight">{prompt.title}</h1>
            <p className="text-muted-foreground">
              {prompt.titleZh} · {t.writing.minWords} {prompt.minWords} · {prompt.suggestedMinutes}{" "}
              {t.common.minutes}
            </p>
          </div>

          <div className="border-y border-border py-6">
            <p className="font-serif text-sm leading-relaxed whitespace-pre-line text-foreground/90">
              {prompt.promptEn}
            </p>
            <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {prompt.promptZh}
            </p>
          </div>

          <WritingEditor promptId={prompt.id} minWords={prompt.minWords} />

          {past.length > 0 && (
            <section>
              <SectionLabel as="h2" className="mb-3">
                {t.writing.pastSubmissions}
              </SectionLabel>
              <ul className="divide-y divide-border border-y border-border">
                {past.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/writing/submissions/${s.id}`}
                      className="flex items-center justify-between gap-4 py-3 text-sm transition-colors hover:bg-muted/50"
                    >
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatLearnerDate(s.createdAt, locale, timeZone, {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        · {s.wordCount} {t.common.words}
                      </span>
                      <span
                        className={`font-medium ${
                          s.status === "ai_scored" ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {s.status === "ai_scored" && s.feedback
                          ? s.feedback.scoreLabel
                          : t.writing.selfAssessTitle}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </FlowBody>
    </>
  );
}
