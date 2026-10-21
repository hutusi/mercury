import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { SpeakingRunner } from "@/components/speaking/SpeakingRunner";
import { isAiEnabled } from "@/lib/ai/client";
import { requireUser } from "@/lib/auth/session";
import { getTierForUser } from "@/lib/queries/membership";
import { formatLearnerDate } from "@/lib/format-date";
import { getSettings } from "@/lib/settings";
import { getDict, getLocale } from "@/lib/i18n";
import { getSpeakingPromptWithHistory } from "@/lib/queries/speaking";

// Makes a runtime AI call (directly or via server actions): the provider
// budget plus claim/publish headroom, inside the lease stale window
// (src/lib/ai/budget.ts).
export const maxDuration = 115;

export default async function SpeakingPromptPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  const [user, { promptId }] = await Promise.all([requireUser(), params]);
  // One wave: none of these depend on each other once the user is known.
  const [settings, tier, t, locale, data] = await Promise.all([
    getSettings(user.id),
    getTierForUser(user.id),
    getDict(),
    getLocale(),
    getSpeakingPromptWithHistory(user.id, promptId),
  ]);
  const timeZone = settings?.timeZone ?? "Asia/Shanghai";
  if (!data) notFound();
  const { prompt, past } = data;

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
        showPremiumCta={tier !== "premium"}
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
                    {formatLearnerDate(s.createdAt, locale, timeZone, {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    · {s.durationSeconds}
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
