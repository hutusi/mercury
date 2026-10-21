import { FlowBody } from "@/components/flow/FlowBody";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { getFlowContext } from "@/lib/queries/plan";
import { notFound } from "next/navigation";
import { NextStopButton } from "@/components/flow/NextStopButton";
import { Button } from "@/components/ui/button";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { PremiumCta } from "@/components/premium/PremiumCta";
import { RetrySpeakingFeedback } from "@/components/speaking/RetrySpeakingFeedback";
import { SelfAssessPanel } from "@/components/speaking/SelfAssessPanel";
import { SpeakingFeedbackPanel } from "@/components/speaking/SpeakingFeedbackPanel";
import { isAiEnabled } from "@/lib/ai/client";
import { requireOnboarded } from "@/lib/settings";
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
  const [{ user, timeZone }, { submissionId }] = await Promise.all([requireOnboarded(), params]);
  const [tier, t, data] = await Promise.all([
    getTierForUser(user.id),
    getDict(),
    getSpeakingSubmissionDetail(user.id, submissionId),
  ]);
  if (!data) notFound();
  const { submission, prompt } = data;
  // The result step of the prompt's stop, if today's route has one.
  const flow = await getFlowContext(user.id, timeZone, "speaking", prompt.id);

  return (
    <>
      <FlowHeader context={flow} hubHref="/speaking" />
      <FlowBody>
        <p className="text-[0.8125rem] text-muted-foreground">
          {t.speakingParts[prompt.partType]} · {prompt.titleZh}
        </p>
        <h1 className="mt-2 font-serif text-[1.75rem] leading-tight font-medium sm:text-4xl">
          {t.speaking.feedbackTitle}
        </h1>

        <div className="mt-6">
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
                  <>
                    {isAiEnabled() && <RetrySpeakingFeedback submissionId={submission.id} />}
                    {submission.degradeReason === "quota" && tier !== "premium" && <PremiumCta />}
                  </>
                ) : undefined
              }
            />
          )}
        </div>

        <section aria-labelledby="speak-yours" className="mt-8">
          <h2 id="speak-yours" className="text-[0.9375rem] font-semibold">
            {t.speaking.transcript}
            <span className="ml-2 font-normal text-muted-foreground tabular-nums">
              {submission.durationSeconds}
              {t.common.seconds}
            </span>
          </h2>
          <p className="mt-3 rounded-lg border border-border bg-card px-5 py-4 text-[0.9375rem] leading-[1.75]">
            {submission.transcript}
          </p>
        </section>

        <div className="mt-8 flex flex-col gap-2.5">
          {flow.mode === "plan" ? <NextStopButton context={flow} className="w-full" /> : null}
          <div className="flex gap-2.5">
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/speaking/${prompt.id}`}>{t.speaking.again}</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/speaking">{t.reading.backToList}</Link>
            </Button>
          </div>
        </div>
      </FlowBody>
    </>
  );
}
