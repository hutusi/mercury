import { FlowBody } from "@/components/flow/FlowBody";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { getFlowContext } from "@/lib/queries/plan";
import { notFound } from "next/navigation";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { AiFeedbackPanel } from "@/components/writing/AiFeedbackPanel";
import { PremiumCta } from "@/components/premium/PremiumCta";
import { RetryWritingFeedback } from "@/components/writing/RetryWritingFeedback";
import { SelfAssessPanel } from "@/components/writing/SelfAssessPanel";
import { isAiEnabled } from "@/lib/ai/client";
import { requireOnboarded } from "@/lib/settings";
import { getTierForUser } from "@/lib/queries/membership";
import { getDict } from "@/lib/i18n";
import { getWritingSubmissionDetail } from "@/lib/queries/writing";

// Makes a runtime AI call (directly or via server actions): the provider
// budget plus claim/publish headroom, inside the lease stale window
// (src/lib/ai/budget.ts).
export const maxDuration = 115;

export default async function WritingSubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const [{ user, timeZone }, { submissionId }] = await Promise.all([requireOnboarded(), params]);
  const [tier, t, data] = await Promise.all([
    getTierForUser(user.id),
    getDict(),
    getWritingSubmissionDetail(user.id, submissionId),
  ]);
  if (!data) notFound();
  const { submission, prompt } = data;
  // The result step of the prompt's stop, if today's route has one.
  const flow = await getFlowContext(user.id, timeZone, "writing", prompt.id);

  return (
    <>
      <FlowHeader context={flow} hubHref="/writing" />
      <FlowBody>
        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-3xl font-medium tracking-tight">
              {t.writing.feedbackTitle}
            </h1>
          </div>

          <section className="border-y border-border py-6">
            <SectionLabel as="h2" className="mb-3">
              {t.writing.yourText} · {submission.wordCount} {t.common.words}
            </SectionLabel>
            <p className="font-serif text-sm leading-relaxed whitespace-pre-line text-foreground/90">
              {submission.text}
            </p>
          </section>

          {submission.status === "ai_scored" && submission.feedback ? (
            <AiFeedbackPanel feedback={submission.feedback} />
          ) : (
            // A quota degrade keeps its explanatory notice, but the reason is
            // historical (the quota resets each learner-local day), so the retry
            // control is always available: too early yields the typed quota
            // message, and a successful retry clears degrade_reason.
            <SelfAssessPanel
              modelAnswer={prompt.modelAnswer}
              checklist={prompt.checklist}
              title={submission.degradeReason === "quota" ? t.writing.aiQuotaTitle : undefined}
              hint={submission.degradeReason === "quota" ? t.writing.aiQuotaHint : undefined}
              canRetry={isAiEnabled()}
              retry={
                // Content-aware: a premium user's quota degrade with AI disabled
                // would otherwise render an empty wrapper (phantom spacing).
                isAiEnabled() || (submission.degradeReason === "quota" && tier !== "premium") ? (
                  <div className="space-y-3">
                    {isAiEnabled() && <RetryWritingFeedback submissionId={submission.id} />}
                    {submission.degradeReason === "quota" && tier !== "premium" && <PremiumCta />}
                  </div>
                ) : undefined
              }
            />
          )}
        </div>
      </FlowBody>
    </>
  );
}
