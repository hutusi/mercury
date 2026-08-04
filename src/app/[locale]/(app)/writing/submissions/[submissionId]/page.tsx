import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { AiFeedbackPanel } from "@/components/writing/AiFeedbackPanel";
import { PremiumCta } from "@/components/premium/PremiumCta";
import { RetryWritingFeedback } from "@/components/writing/RetryWritingFeedback";
import { SelfAssessPanel } from "@/components/writing/SelfAssessPanel";
import { isAiEnabled } from "@/lib/ai/client";
import { requireUser } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n";
import { getWritingSubmissionDetail } from "@/lib/queries/writing";

export default async function WritingSubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const user = await requireUser();
  const { submissionId } = await params;
  const t = await getDict();

  const data = await getWritingSubmissionDetail(user.id, submissionId);
  if (!data) notFound();
  const { submission, prompt } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/writing/${prompt.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {prompt.title}
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight">
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
            isAiEnabled() || submission.degradeReason === "quota" ? (
              <div className="space-y-3">
                {isAiEnabled() && <RetryWritingFeedback submissionId={submission.id} />}
                {submission.degradeReason === "quota" && <PremiumCta />}
              </div>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
