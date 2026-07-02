"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startExamAttempt } from "@/lib/actions/exams";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/routing";

export function StartExamButton({ examId, resume }: { examId: string; resume: boolean }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start() {
    setError(null);
    startTransition(async () => {
      try {
        await startExamAttempt(examId);
        router.push(localePath(locale, `/exams/${examId}/take`));
      } catch {
        setError(t.exams.submitFailed);
      }
    });
  }

  return (
    <div className="space-y-3">
      <button
        onClick={start}
        disabled={pending}
        className={`w-full rounded-lg px-6 py-3.5 font-semibold shadow-xs transition disabled:opacity-50 sm:w-auto ${
          resume
            ? "bg-amber-500 text-white hover:bg-amber-600"
            : "bg-primary text-primary-foreground hover:bg-primary/80"
        }`}
      >
        {pending ? t.common.loading : resume ? t.exams.resumeExam : t.exams.startExam}
      </button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
