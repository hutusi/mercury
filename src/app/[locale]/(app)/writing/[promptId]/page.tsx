import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { WritingEditor } from "@/components/writing/WritingEditor";
import { db } from "@/lib/db";
import { writingPrompts, writingSubmissions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getDict, getLocale } from "@/lib/i18n";

export default async function WritingPromptPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  const user = await requireUser();
  const { promptId } = await params;
  const [t, locale] = await Promise.all([getDict(), getLocale()]);

  const prompt = await db.query.writingPrompts.findFirst({
    where: eq(writingPrompts.id, promptId),
  });
  if (!prompt) notFound();

  const past = await db.query.writingSubmissions.findMany({
    where: and(eq(writingSubmissions.userId, user.id), eq(writingSubmissions.promptId, promptId)),
    orderBy: desc(writingSubmissions.createdAt),
    limit: 10,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/writing"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.nav.writing}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{prompt.title}</h1>
        <p className="text-muted-foreground">
          {prompt.titleZh} · {t.writing.minWords} {prompt.minWords} · {prompt.suggestedMinutes}{" "}
          {t.common.minutes}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-xs">
        <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">
          {prompt.promptEn}
        </p>
        <p className="mt-4 border-t pt-4 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
          {prompt.promptZh}
        </p>
      </div>

      <WritingEditor promptId={prompt.id} minWords={prompt.minWords} />

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t.writing.pastSubmissions}
          </h2>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
            {past.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/writing/submissions/${s.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-muted"
                >
                  <span className="text-muted-foreground">
                    {s.createdAt.toLocaleString(locale === "zh" ? "zh-CN" : "en-US")} ·{" "}
                    {s.wordCount} words
                  </span>
                  <span
                    className={`font-semibold ${
                      s.status === "ai_scored" ? "text-primary" : "text-muted-foreground"
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
