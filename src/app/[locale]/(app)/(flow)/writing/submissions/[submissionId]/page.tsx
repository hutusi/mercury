import { FlowBody } from "@/components/flow/FlowBody";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { getFlowContext } from "@/lib/queries/plan";
import { notFound } from "next/navigation";
import { NextStopButton } from "@/components/flow/NextStopButton";
import { Button } from "@/components/ui/button";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
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
        <p className="text-[0.8125rem] text-muted-foreground">
          {t.writingTasks[prompt.taskType]} · {prompt.titleZh}
        </p>
        <h1 className="mt-2 font-serif text-[1.75rem] leading-tight font-medium sm:text-4xl">
          {t.writing.feedbackTitle}
        </h1>

        <div className="mt-6">
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
                  <div className="flex flex-col items-start gap-3">
                    {isAiEnabled() && <RetryWritingFeedback submissionId={submission.id} />}
                    {submission.degradeReason === "quota" && tier !== "premium" && <PremiumCta />}
                  </div>
                ) : undefined
              }
            />
          )}
        </div>

        <section aria-labelledby="writing-yours" className="mt-8">
          <h2 id="writing-yours" className="text-[0.9375rem] font-semibold">
            {t.writing.yourText}
            <span className="ml-2 font-normal text-muted-foreground tabular-nums">
              {submission.wordCount} {t.common.words}
            </span>
          </h2>
          <p className="mt-3 rounded-lg border border-border bg-card px-5 py-4 font-serif text-base leading-[1.75] whitespace-pre-line">
            {submission.text}
          </p>
        </section>

        <div className="mt-8 flex flex-col gap-2.5">
          {flow.mode === "plan" ? <NextStopButton context={flow} className="w-full" /> : null}
          <div className="flex gap-2.5">
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/writing/${prompt.id}`}>{t.writing.rewrite}</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/writing">{t.reading.backToList}</Link>
            </Button>
          </div>
        </div>
      </FlowBody>
    </>
  );
}
