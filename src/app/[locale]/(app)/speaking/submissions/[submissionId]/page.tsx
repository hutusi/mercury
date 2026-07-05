import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { RetrySpeakingFeedback } from "@/components/speaking/RetrySpeakingFeedback";
import { SelfAssessPanel } from "@/components/speaking/SelfAssessPanel";
import { SpeakingFeedbackPanel } from "@/components/speaking/SpeakingFeedbackPanel";
import { isAiEnabled } from "@/lib/ai/client";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { speakingPrompts, speakingSubmissions } from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";

export default async function SpeakingSubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const user = await requireUser();
  const { submissionId } = await params;
  const t = await getDict();

  const submission = await db.query.speakingSubmissions.findFirst({
    where: and(eq(speakingSubmissions.id, submissionId), eq(speakingSubmissions.userId, user.id)),
  });
  if (!submission) notFound();

  const prompt = await db.query.speakingPrompts.findFirst({
    where: eq(speakingPrompts.id, submission.promptId),
  });
  if (!prompt) notFound();

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
        <SelfAssessPanel
          modelAnswer={prompt.modelAnswer}
          checklist={prompt.checklist}
          canRetry={isAiEnabled()}
          retry={isAiEnabled() ? <RetrySpeakingFeedback submissionId={submission.id} /> : undefined}
        />
      )}
    </div>
  );
}
