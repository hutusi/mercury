import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { WritingEditor } from "@/components/writing/WritingEditor";
import { requireUser } from "@/lib/auth/session";
import { getDict, getLocale } from "@/lib/i18n";
import { getWritingPromptWithHistory } from "@/lib/queries/writing";

export default async function WritingPromptPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  const user = await requireUser();
  const { promptId } = await params;
  const [t, locale] = await Promise.all([getDict(), getLocale()]);

  const data = await getWritingPromptWithHistory(user.id, promptId);
  if (!data) notFound();
  const { prompt, past } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/writing"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.nav.writing}
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight">{prompt.title}</h1>
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
                    {s.createdAt.toLocaleString(locale === "zh" ? "zh-CN" : "en-US")} ·{" "}
                    {s.wordCount} words
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
  );
}
