import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { AiFeedbackPanel } from "@/components/writing/AiFeedbackPanel";
import { SelfAssessPanel } from "@/components/writing/SelfAssessPanel";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { writingPrompts, writingSubmissions } from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";

export default async function WritingSubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const user = await requireUser();
  const { submissionId } = await params;
  const t = await getDict();

  const submission = await db.query.writingSubmissions.findFirst({
    where: and(eq(writingSubmissions.id, submissionId), eq(writingSubmissions.userId, user.id)),
  });
  if (!submission) notFound();

  const prompt = await db.query.writingPrompts.findFirst({
    where: eq(writingPrompts.id, submission.promptId),
  });
  if (!prompt) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/writing/${prompt.id}`}
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          ← {prompt.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{t.writing.feedbackTitle}</h1>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
          {t.writing.yourText} · {submission.wordCount} words
        </h2>
        <p className="text-sm leading-relaxed whitespace-pre-line text-slate-800">
          {submission.text}
        </p>
      </section>

      {submission.status === "ai_scored" && submission.feedback ? (
        <AiFeedbackPanel feedback={submission.feedback} />
      ) : (
        <SelfAssessPanel modelAnswer={prompt.modelAnswer} checklist={prompt.checklist} />
      )}
    </div>
  );
}
