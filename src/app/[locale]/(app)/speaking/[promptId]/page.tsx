import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { SpeakingRunner } from "@/components/speaking/SpeakingRunner";
import { isAiEnabled } from "@/lib/ai/client";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { speakingPrompts, speakingSubmissions } from "@/lib/db/schema";
import { getDict, getLocale } from "@/lib/i18n";

export default async function SpeakingPromptPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  const user = await requireUser();
  const { promptId } = await params;
  const [t, locale] = await Promise.all([getDict(), getLocale()]);

  const [prompt, past] = await Promise.all([
    db.query.speakingPrompts.findFirst({
      where: eq(speakingPrompts.id, promptId),
    }),
    db.query.speakingSubmissions.findMany({
      where: and(
        eq(speakingSubmissions.userId, user.id),
        eq(speakingSubmissions.promptId, promptId),
      ),
      orderBy: desc(speakingSubmissions.createdAt),
      limit: 10,
    }),
  ]);
  if (!prompt) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/speaking"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.nav.speaking}
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight">{prompt.title}</h1>
        <p className="text-muted-foreground">{prompt.titleZh}</p>
      </div>

      <div className="border-y border-border py-6">
        <p className="font-serif text-sm leading-relaxed whitespace-pre-line text-foreground/90">
          {prompt.promptEn}
        </p>
        <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
          {prompt.promptZh}
        </p>
      </div>

      <SpeakingRunner
        promptId={prompt.id}
        prepSeconds={prompt.prepSeconds}
        speakSeconds={prompt.speakSeconds}
        modelAnswer={prompt.modelAnswer}
        checklist={prompt.checklist}
        aiEnabled={isAiEnabled()}
      />

      {past.length > 0 && (
        <section>
          <SectionLabel as="h2" className="mb-3">
            {t.speaking.pastSubmissions}
          </SectionLabel>
          <ul className="divide-y divide-border border-y border-border">
            {past.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/speaking/submissions/${s.id}`}
                  className="flex items-center justify-between gap-4 py-3 text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {s.createdAt.toLocaleString(locale === "zh" ? "zh-CN" : "en-US")} ·{" "}
                    {s.durationSeconds}
                    {t.common.seconds}
                  </span>
                  <span
                    className={`font-medium ${
                      s.status === "ai_scored" ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s.status === "ai_scored" && s.feedback
                      ? s.feedback.scoreLabel
                      : t.speaking.selfAssessTitle}
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
