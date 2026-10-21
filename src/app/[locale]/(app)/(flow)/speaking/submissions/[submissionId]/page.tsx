import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { PremiumCta } from "@/components/premium/PremiumCta";
import { RetrySpeakingFeedback } from "@/components/speaking/RetrySpeakingFeedback";
import { SelfAssessPanel } from "@/components/speaking/SelfAssessPanel";
import { SpeakingFeedbackPanel } from "@/components/speaking/SpeakingFeedbackPanel";
import { isAiEnabled } from "@/lib/ai/client";
import { requireUser } from "@/lib/auth/session";
import { getTierForUser } from "@/lib/queries/membership";
import { getDict } from "@/lib/i18n";
import { getSpeakingSubmissionDetail } from "@/lib/queries/speaking";

// Makes a runtime AI call (directly or via server actions): the provider
// budget plus claim/publish headroom, inside the lease stale window
// (src/lib/ai/budget.ts).
export const maxDuration = 115;

export default async function SpeakingSubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const [user, { submissionId }] = await Promise.all([requireUser(), params]);
  const [tier, t, data] = await Promise.all([
    getTierForUser(user.id),
    getDict(),
    getSpeakingSubmissionDetail(user.id, submissionId),
  ]);
  if (!data) notFound();
  const { submission, prompt } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/speaking/${prompt.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {prompt.title}
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight">
          {t.speaking.feedbackTitle}
        </h1>
      </div>

      <section className="border-y border-border py-6">
        <SectionLabel as="h2" className="mb-3">
          {t.speaking.transcript} · {submission.durationSeconds}
          {t.common.seconds}
        </SectionLabel>
        <p className="text-sm leading-relaxed text-foreground/80">{submission.transcript}</p>
      </section>

      {submission.status === "ai_scored" && submission.feedback ? (
        <SpeakingFeedbackPanel feedback={submission.feedback} />
      ) : (
        // A quota degrade keeps its explanatory notice, but the reason is
        // historical (the quota resets each learner-local day), so the retry
        // control is always available: too early yields the typed quota
        // message, and a successful retry clears degrade_reason.
        <SelfAssessPanel
          modelAnswer={prompt.modelAnswer}
          checklist={prompt.checklist}
          title={submission.degradeReason === "quota" ? t.speaking.aiQuotaTitle : undefined}
          hint={submission.degradeReason === "quota" ? t.speaking.aiQuotaHint : undefined}
          canRetry={isAiEnabled()}
          retry={
            // Content-aware: a premium user's quota degrade with AI disabled
            // would otherwise render an empty wrapper (phantom spacing).
            isAiEnabled() || (submission.degradeReason === "quota" && tier !== "premium") ? (
              <div className="space-y-3">
                {isAiEnabled() && <RetrySpeakingFeedback submissionId={submission.id} />}
                {submission.degradeReason === "quota" && tier !== "premium" && <PremiumCta />}
              </div>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
